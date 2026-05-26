# 🗺️ AI Trip Planner — India
## Python Backend + HTML Frontend

---

## 📁 Project Structure
```
trip_planner/
├── server.py          ← Python Flask backend (main file)
├── requirements.txt   ← Python dependencies
├── README.md          ← This file
└── static/
    └── index.html     ← Frontend UI (served by Flask)
    ├── style.css
    ├── script.js
```

---

## ⚡ Quick Start (3 steps)

### Step 1 — Install dependencies
```bash
pip install -r requirements.txt
```

### Step 2 — Set your Gemini key (optional but recommended)
```bash
# On Mac/Linux:
export Gemini_API_KEY=sk-ant-api03-your-key-here

# On Windows CMD:
set Gemini_API_KEY=sk-ant-api03-your-key-here

# On Windows PowerShell:
$env:Gemini_API_KEY="sk-ant-api03-your-key-here"
```
> If you skip this, you can enter the key directly in the app UI.

### Step 3 — Run the server
```bash
python server.py
```

Then open your browser and go to:
**http://localhost:5000**

---

## 🔑 Getting an Gemini API Key
1. Go to https://aistudio.google.com
2. Sign up / Log in
3. Click "API Keys" → "Create Key"
4. Copy the key (starts with `sk-ant-api03-...`)

---

## 🌐 API Endpoints

| Method | Endpoint        | Description                        |
|--------|-----------------|------------------------------------|
| GET    | `/`             | Serves the frontend HTML           |
| GET    | `/health`       | Server health check                |
| POST   | `/api/plan`     | Get all trip destinations from AI  |

### POST /api/plan — Request body:
```json
{
  "budget": 15000,
  "location": "Delhi",
  "people": 2,
  "group": "Friends",
  "interests": ["Adventure", "Hill Station"],
  "api_key": "sk-ant-..." 
}
```

### POST /api/itinerary — Request body:
```json
{
  "destination": "Manali",
  "from_city": "Delhi",
  "days": 4,
  "people": 2,
  "budget": 15000,
  "transport_mode": "Bus",
  "interests": ["Adventure"],
  "api_key": "sk-ant-..."
}
```

---

## ✅ Features
- 100+ Indian destinations scanned
- Real AI cost calculation (Claude Sonnet 4)
- Transport, stay, food, activities breakdown
- Number of days calculated automatically
- Full day-by-day itinerary generation
- Solo / Friends / Family group support
- People counter (min 2 for groups)
- 12 travel interest categories
- Best Fit / Good Value / Stretch badges
- No CORS issues — backend proxies the API
- No copy-paste — fully automatic

---

## 🛠️ Troubleshooting

**"Backend not running" error in browser:**
→ Make sure `python server.py` is running in terminal

**"Invalid API key" error:**
→ Check your key at https://console.aistudio.com

**"ModuleNotFoundError: flask":**
→ Run `pip install -r requirements.txt`

**Port 5000 already in use:**
→ Change port in server.py: `app.run(port=5001)`
→ Then open http://localhost:5001
