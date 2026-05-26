// ── State ─────────────────────────────────────────────────────────────────────
let interests    = ['Adventure'];
let groupType    = 'Solo';
let people       = 1;
let currentDests = [];
let controller   = null;

const SERVER     = '';  // same origin — served by Flask

// ── Server health check ───────────────────────────────────────────────────────
async function checkServer() {
  try {
    const r = await fetch(SERVER + '/health');
    if (r.ok) {
      document.getElementById('status-bar').className = 'status-bar status-ok';
      document.getElementById('status-dot').className = 'status-dot dot-ok';
      document.getElementById('status-text').textContent = '✅ Gemini backend connected — ready to plan trips';
    } else throw new Error();
  } catch {
    document.getElementById('status-bar').className = 'status-bar status-err';
    document.getElementById('status-dot').className = 'status-dot dot-err';
    document.getElementById('status-text').textContent = '❌ Backend not running — run: python server.py';
  }
}
checkServer();

// ── Interest chips ────────────────────────────────────────────────────────────
document.querySelectorAll('#ichips .chip').forEach(c => {
  c.addEventListener('click', () => {
    c.classList.toggle('on');
    const v = c.dataset.v;
    interests.includes(v) ? interests = interests.filter(x => x !== v) : interests.push(v);
  });
});

// ── Group cards ───────────────────────────────────────────────────────────────
document.querySelectorAll('#gcards .gc').forEach(c => {
  c.addEventListener('click', () => {
    document.querySelectorAll('#gcards .gc').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    groupType = c.dataset.v;
    const pr = document.getElementById('prow');
    if (groupType === 'Solo') { people = 1; pr.style.display = 'none'; }
    else { if (people < 2) { people = 2; document.getElementById('pc').textContent = 2; } pr.style.display = 'flex'; }
  });
});

// ── People counter ────────────────────────────────────────────────────────────
document.getElementById('dec').addEventListener('click', () => {
  const min = groupType === 'Solo' ? 1 : 2;
  if (people > min) { people--; document.getElementById('pc').textContent = people; }
});
document.getElementById('inc').addEventListener('click', () => {
  if (people < 30) { people++; document.getElementById('pc').textContent = people; }
});

// ── Nav ───────────────────────────────────────────────────────────────────────
function goBack() {
  document.getElementById('fs').style.display = 'block';
  document.getElementById('rs').style.display = 'none';
  document.getElementById('err').classList.remove('show');
}

// ── Loading messages ──────────────────────────────────────────────────────────
const msgs = [
  'Gemini is scanning all of India...',
  'Checking trains, buses & flights...',
  'Calculating per-person costs...',
  'Finding every destination that fits...',
  'Almost done — building your complete list!'
];

// ── Main plan function ────────────────────────────────────────────────────────
document.getElementById('go').addEventListener('click', async () => {
  const budget   = parseInt(document.getElementById('budget').value);
  const location = document.getElementById('location').value.trim();
  const errEl    = document.getElementById('err');
  errEl.classList.remove('show');

  if (!budget || budget < 500) { errEl.textContent = 'Please enter a budget of at least ₹500.'; errEl.classList.add('show'); return; }
  if (!location)               { errEl.textContent = 'Please enter your starting city.'; errEl.classList.add('show'); return; }
  if (interests.length === 0)  { errEl.textContent = 'Please select at least one travel interest.'; errEl.classList.add('show'); return; }

  document.getElementById('fs').style.display = 'none';
  document.getElementById('ls').style.display = 'block';
  document.getElementById('rs').style.display = 'none';

  let mi = 0;
  const smsg = document.getElementById('smsg');
  smsg.textContent = msgs[0];
  const timer = setInterval(() => { mi = (mi+1) % msgs.length; smsg.textContent = msgs[mi]; }, 1800);

  try {

    if (controller) {
    controller.abort();
    }

    controller = new AbortController();

  const resp = await fetch(SERVER + '/api/plan', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      budget,
      location,
      people,
      group: groupType,
      interests
    })
  });

    clearInterval(timer);
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || 'Server error');

    currentDests = data.destinations;
    document.getElementById('ls').style.display = 'none';
    renderResults(currentDests, budget, people, location);

  } catch (e) {
    clearInterval(timer);
    document.getElementById('ls').style.display = 'none';
    document.getElementById('fs').style.display = 'block';
    errEl.textContent = '❌ ' + (e.message || 'Something went wrong. Is server.py running?');
    errEl.classList.add('show');
  }
});

// ── Render results ────────────────────────────────────────────────────────────
function f(n) { return Math.round(n || 0).toLocaleString('en-IN'); }

function renderResults(dests, budget, people, city) {
  const best = dests.filter(d => d.badge === 'Best Fit').length;
  const good = dests.filter(d => d.badge === 'Good Value').length;
  const str  = dests.filter(d => d.badge === 'Stretch').length;

  document.getElementById('rtitle').textContent = people > 1
    ? `${dests.length} destinations · ₹${f(budget)} · ${people} people`
    : `${dests.length} destinations · ₹${f(budget)}`;

  const bc = { 'Best Fit': 'b-best', 'Good Value': 'b-good', 'Stretch': 'b-str' };

  let html = `<div class="summrow">
    <span class="sbadge s-best">🟢 ${best} Best Fit</span>
    <span class="sbadge s-good">🟡 ${good} Good Value</span>
    <span class="sbadge s-str">🟠 ${str} Stretch</span>
    <span class="sbadge s-powered">✦ Gemini AI</span>
  </div>`;

  dests.forEach((d, i) => {
    const cls     = bc[d.badge] || 'b-good';
    const pct     = d.pct || Math.round(d.total / budget * 100);
    const attractions = Array.isArray(d.attractions)
      ? d.attractions
      : [];
      
    const attrs = attractions.length
      ? attractions.map(a =>
        `<span class="at">${a}</span>`
      ).join('')
    : '<span class="at">No attractions available</span>';
    const ppd     = d.food_ppd || 0;
    const ds      = d.daily_stay || 0;
    const dailyPP = Math.round(ppd + ds / Math.max(people, 1));

    html += `<div class="dcard">
      <div class="dhdr">
        <div>
          <div class="dname">${d.name}</div>
          <div class="dstate">${d.state || ''}</div>
          ${d.why ? `<div class="dwhy">${d.why}</div>` : ''}
        </div>
        <span class="dbadge ${cls}">${d.badge}</span>
      </div>
      <div class="stats">
        <div class="sbox"><div class="sv">${d.days}</div><div class="sl2">Days</div></div>
        <div class="sbox"><div class="sv">₹${f(d.total / people)}</div><div class="sl2">Per person</div></div>
        <div class="sbox"><div class="sv">${pct}%</div><div class="sl2">Used</div></div>
        <div class="sbox"><div class="sv">₹${f(dailyPP)}</div><div class="sl2">Daily/person</div></div>
      </div>
      <div class="bkdn">
        <div class="br"><span class="bl">✈ ${d.transport_mode || 'Transport'}</span><span class="bv">₹${f(d.transport_total)}</span></div>
        <div class="br"><span class="bl">🏨 Stay (${d.days}n)</span><span class="bv">₹${f(d.stay_total)}</span></div>
        <div class="br"><span class="bl">🍽 ${d.food_type || 'Food'}</span><span class="bv">₹${f(d.food_total)}</span></div>
        <div class="br"><span class="bl">🎒 Activities</span><span class="bv">₹${f(d.acts)}</span></div>
      </div>
      <div class="pbar"><div class="pf" style="width:${Math.min(pct,100)}%"></div></div>
      <div class="plbl2">₹${f(d.total)} of ₹${f(budget)} budget used</div>
      <div class="atlbl">Nearby Attractions</div>
      <div class="ats">${attrs}</div>
      ${d.tip ? `<div class="tip">💡 ${d.tip}</div>` : ''}
      <button class="itinbtn" onclick="getItinerary(${i})">
        Get full ${d.days}-day itinerary ↗
      </button>
    </div>`;
  });

  document.getElementById('rc').innerHTML = html;
  document.getElementById('rs').style.display = 'block';
}

// ── Itinerary modal ───────────────────────────────────────────────────────────
async function getItinerary(idx) {
  const d      = currentDests[idx];
  const city   = document.getElementById('location').value.trim();
  const budget = parseInt(document.getElementById('budget').value);

  document.getElementById('modal-title').textContent = `${d.days}-Day Itinerary: ${d.name}`;
  document.getElementById('modal-loading').style.display = 'block';
  document.getElementById('modal-body').style.display    = 'none';
  document.getElementById('modal').classList.add('show');

  try {
    const resp = await fetch(SERVER + '/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination:    d.name,
        from_city:      city,
        days:           d.days,
        people,
        budget,
        transport_mode: d.transport_mode,
        interests,
        api_key:        ''
      })
    });

    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error);

    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-body').style.display    = 'block';
    document.getElementById('modal-body').textContent      = data.itinerary;

  } catch (e) {
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-body').style.display    = 'block';
    document.getElementById('modal-body').textContent      = 'Error: ' + (e.message || 'Could not generate itinerary.');
  }
}

function closeModal() { document.getElementById('modal').classList.remove('show'); }
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});