import os
import time
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="static")
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

MODELS = [

    "gemini-2.5-flash"
]

BASE_URL = (
    "https://generativelanguage.googleapis.com/"
    "v1beta/models/{model}:generateContent?key={key}"
)

session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

CITIES = """
Srinagar, Gulmarg, Sonamarg, Shimla, Manali, Kasol,
Nainital, Mussoorie, Rishikesh, Haridwar,
Jaipur, Udaipur, Jaisalmer, Jodhpur, Pushkar,
Mount Abu, Ahmedabad, Mumbai, Lonavala,
Mahabaleshwar, Goa, Bengaluru, Coorg,
Hampi, Gokarna, Munnar, Ooty,
Kodaikanal, Kanyakumari, Hyderabad,
Puri, Darjeeling, Gangtok, Shillong,
Cherrapunji, Bodh Gaya, Rajgir,
Bandhavgarh, Agra, Varanasi,
Ayodhya, Mathura, Vrindavan,
Puducherry, Chandigarh, Leh
"""


def chunk_list(items, size=8):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def call_gemini(prompt, max_tokens=1800):
    if not GEMINI_API_KEY:
        raise Exception("Missing GEMINI_API_KEY in .env")

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": max_tokens
        }
    }

    last_error = "Unknown error"

    for model in MODELS:
        url = BASE_URL.format(
            model=model,
            key=GEMINI_API_KEY
        )

        for attempt in range(2):
            try:
                print(f"[{model}] attempt {attempt + 1}")

                response = session.post(
                    url,
                    json=payload,
                    timeout=90
                )

                if response.status_code == 200:
                    data = response.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    print(f"SUCCESS {model} ({len(text)} chars)")
                    return text

                elif response.status_code == 429:
                    wait = 10 * (attempt + 1)
                    print(f"RATE LIMIT {model}, waiting {wait}s")
                    time.sleep(wait)
                    continue

                elif response.status_code == 503:
                    wait = 8 * (attempt + 1)
                    print(f"MODEL BUSY {model}, waiting {wait}s")
                    time.sleep(wait)
                    continue

                else:
                    print(response.text)
                    last_error = response.text
                    break

            except Exception as e:
                last_error = str(e)
                print(last_error)
                break

    raise Exception(last_error)


def get_matching_places(location, budget, interests):
    prompt = f"""
You are an Indian budget travel expert.

Starting city: {location}
Budget: Rs{budget}
Interests: {', '.join(interests)}

Choose realistic destinations from this list:
{CITIES}

Rules:
- Prefer train/bus travel
- Avoid expensive unrealistic options
- Return 6 to 8 destinations only
- Comma separated city names
- No explanation
"""

    raw = call_gemini(prompt, 1000)

    cities = [x.strip() for x in raw.split(",") if x.strip()]
    return cities[:8]


@app.route("/")
def home():
    return send_from_directory("static", "index.html")


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/plan", methods=["POST"])
def plan_trip():
    try:
        data = request.get_json()

        budget = int(data.get("budget", 10000))
        location = data.get("location", "Delhi")
        people = int(data.get("people", 1))
        interests = data.get("interests", ["Adventure"])

        print(f"Plan: Rs{budget}, {people} people from {location}")

        matched_places = get_matching_places(
            location,
            budget,
            interests
        )

        print("MATCHED:", matched_places)

        all_destinations = []

        for batch in chunk_list(matched_places, 8):
            city_text = ", ".join(batch)

            prompt = f"""
IMPORTANT:
DO NOT RETURN JSON.
ONLY RETURN PLAIN TEXT.

Budget: Rs{budget}
From: {location}
People: {people}
Destinations: {city_text}

Format:
City|State|Badge|Days|TotalCost|Attraction1,Attraction2,Attraction3

Example:
Rishikesh|Uttarakhand|Best Fit|4|6500|Rafting,Laxman Jhula,Ganga Aarti

Rules:
- One city per line
- Process every destination
- Keep costs realistic
- No markdown
- No numbering
"""

            raw = call_gemini(prompt, 2000)

            print("\nTEXT OUTPUT:\n")
            print(raw)

            for line in raw.splitlines():
                if "|" not in line:
                    continue

                try:
                    parts = [x.strip() for x in line.split("|")]

                    city = parts[0]
                    state = parts[1]
                    badge = parts[2]
                    days = int(parts[3])
                    total = int(parts[4])

                    attractions = []
                    if len(parts) > 5:
                        attractions = [x.strip() for x in parts[5].split(",")][:4]

                    transport_total = int(total * 0.30)
                    stay_total = int(total * 0.35)
                    food_total = int(total * 0.20)
                    acts = max(
                        200,
                        total - (
                            transport_total +
                            stay_total +
                            food_total
                        )
                    )

                    transport_per_person = max(
                        100,
                        int(transport_total / max(people, 1))
                    )

                    stay_per_night = max(
                        500,
                        int(stay_total / max(days, 1))
                    )

                    rooms_needed = max(
                        1,
                        (people + 1) // 2
                    )

                    daily_stay = int(
                        stay_total / max(days, 1)
                    )

                    food_ppd = max(
                        150,
                        int(food_total / max(days * people, 1))
                    )

                    daily_food = max(
                        150,
                        int(total / max(days * people, 1))
                    )

                    pct = min(
                        100,
                        int((total / budget) * 100)
                    )

                    all_destinations.append({
                        "name": city,
                        "state": state,
                        "badge": badge,
                        "why": f"Good match for {', '.join(interests)}",
                        "transport_mode": "Train/Bus",
                        "transport_per_person": transport_per_person,
                        "transport_total": transport_total,
                        "stay_per_night": stay_per_night,
                        "rooms_needed": rooms_needed,
                        "daily_stay": daily_stay,
                        "food_ppd": food_ppd,
                        "daily_food": daily_food,
                        "days": days,
                        "stay_total": stay_total,
                        "food_total": food_total,
                        "acts": acts,
                        "total": total,
                        "pct": pct,
                        "food_type": "Budget Food",
                        "attractions": attractions,
                        "tip": "Use trains, local transport and budget hotels to save money."
                    })

                except Exception:
                    print("PARSE FAIL:", line)

        destinations = [
            d for d in all_destinations
            if d["total"] <= budget
        ]

        print(f"SUCCESS: {len(destinations)} destinations")

        return jsonify({
            "destinations": destinations,
            "count": len(destinations)
        })

    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/itinerary", methods=["POST"])
def get_itinerary():
    try:
        data = request.get_json()

        destination = data.get("destination", "")
        from_city = data.get("from_city", "Delhi")
        days = data.get("days", 3)
        budget = data.get("budget", 10000)
        people = data.get("people", 1)

        prompt = f"""
Create a realistic {days}-day itinerary.

Destination: {destination}
From: {from_city}
Budget: Rs{budget}
People: {people}

Include:
- day wise plan
- food suggestions
- places to visit
- travel tips
"""

        result = call_gemini(prompt, 1800)

        return jsonify({
            "itinerary": result
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("AI Trip Planner Running")
    print("http://localhost:5000")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False
    )
