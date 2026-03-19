require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app  = express();
const PORT = process.env.PORT || 3001;
app.use(cors({ origin: '*' }));
app.use(express.json());

// Groq setup (using GROQ_API_KEY from .env)

// ─── CSV Parse ───────────────────────────────────────
function parseCSVLine(line) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  result.push(cur.trim());
  return result;
}

function loadCSV(filePath) {
  try {
    const text    = fs.readFileSync(filePath, 'utf-8');
    const lines   = text.split(/\r?\n/).filter(l => l.trim());
    const headers = parseCSVLine(lines[0]);
    const rows    = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      const obj  = {};
      headers.forEach((h, idx) => obj[h.trim()] = (vals[idx] || '').trim());
      const id = obj['Order ID'] || '';
      if (!id || id === 'OLD') continue;
      rows.push(obj);
    }
    return rows;
  } catch (e) {
    console.warn('CSV load failed:', e.message);
    return [];
  }
}

function buildHistoryFromCSV(rows) {
  const cityRisk    = {};
  const productRisk = {};
  const issues      = {
    incomplete_address: 0, no_call_pickup: 0,
    institutional_address: 0, junk_address: 0,
    hotel_address: 0, whatsapp_fallback: 0
  };
  let riskCount = 0;

  rows.forEach(r => {
    const conf  = (r['Confirmation (Y/N)'] || '').toUpperCase();
    const notes = (r['Notes'] || '').toLowerCase();
    const addr  = (r['Address Line 1'] || '').toLowerCase();
    const city  = (r['Address City'] || r['Address State'] || 'Unknown').trim();
    const prod  = (r['Product Name'] || '').trim().substring(0, 40);

    const isRisky = conf === 'N'
      || addr.startsWith('0-/')
      || notes.includes("didn't pick")
      || notes.includes('junk address')
      || notes.includes('no address');

    if (isRisky) riskCount++;

    if (!cityRisk[city])    cityRisk[city]    = { risk: 0, total: 0 };
    if (!productRisk[prod]) productRisk[prod] = { risk: 0, total: 0 };
    cityRisk[city].total++;
    productRisk[prod].total++;
    if (isRisky) { cityRisk[city].risk++; productRisk[prod].risk++; }

    if (addr.startsWith('0-/'))                                    issues.incomplete_address++;
    if (notes.includes("didn't pick") || notes.includes('no call')) issues.no_call_pickup++;
    if (addr.includes('hospital') || addr.includes('hostel'))       issues.institutional_address++;
    if (notes.includes('junk'))                                    issues.junk_address++;
    if (addr.includes('hotel'))                                    issues.hotel_address++;
    if (notes.includes('whatsapp'))                                issues.whatsapp_fallback++;
  });

  return {
    total_orders:  rows.length,
    risk_rate_pct: rows.length ? Math.round(riskCount / rows.length * 100) : 0,
    city_risk:     cityRisk,
    product_risk:  productRisk,
    common_issues: issues,
    observed_patterns: [
      "Address starting with '0-/' = Shopify incomplete autofill = HIGH NDR risk",
      "Hotel/hospital/hostel address = delivery failure if no one present to receive",
      "Customer didn't pick up call = 60% RTO chance",
      "Confirmation 'N' = order will definitely cancel",
      "Mumbai/Pune/Bangalore orders = historically low risk in Proskii data",
      "Instagram Ad first-time buyers = higher cancel rate than referrals",
      "Missing pincode or city = moderate NDR risk",
      "WhatsApp fallback = slightly higher risk than direct call confirmation",
    ],
  };
}

// Load CSV at startup
const CSV_PATH = path.join(__dirname, 'proskii_orders.csv');
const csvRows  = loadCSV(CSV_PATH);
const HISTORY  = buildHistoryFromCSV(csvRows);
console.log(`📊 CSV loaded: ${HISTORY.total_orders} orders | Risk rate: ${HISTORY.risk_rate_pct}%`);

// ─── Build AI context ────────────────────────────────
function buildContext(city, product, notes, address) {
  const addr = (address || '').toLowerCase();
  const nt   = (notes   || '').toLowerCase();

  const cityKey = Object.keys(HISTORY.city_risk).find(c =>
    city && city.toLowerCase().includes(c.toLowerCase())
  );
  const cityData = cityKey ? HISTORY.city_risk[cityKey] : null;

  const prodKey = Object.keys(HISTORY.product_risk).find(p =>
    product && product.toLowerCase().includes(p.toLowerCase().split(' ')[0])
  );
  const prodData = prodKey ? HISTORY.product_risk[prodKey] : null;

  const signals = [];
  if (addr.startsWith('0-/'))
    signals.push(`ADDRESS STARTS WITH '0-/' — ${HISTORY.common_issues.incomplete_address} such orders in Proskii data, all had delivery issues`);
  if (addr.includes('hotel'))
    signals.push(`HOTEL ADDRESS — ${HISTORY.common_issues.hotel_address} such order(s) in Proskii history`);
  if (addr.includes('hospital') || addr.includes('hostel'))
    signals.push(`INSTITUTIONAL ADDRESS — ${HISTORY.common_issues.institutional_address} such orders had NDR risk`);
  if (nt.includes("pick up") || nt.includes('no call'))
    signals.push(`NO CALL PICKUP — ${HISTORY.common_issues.no_call_pickup} such orders in data, high RTO risk`);
  if (nt.includes('whatsapp'))
    signals.push(`WHATSAPP FALLBACK — ${HISTORY.common_issues.whatsapp_fallback} such orders, slightly higher risk`);

  let ctx = `=== PROSKII REAL ORDER HISTORY (${HISTORY.total_orders} actual past orders) ===
Overall risk rate: ${HISTORY.risk_rate_pct}% orders had cancellation or delivery issues.

KEY PATTERNS FROM PROSKII DATA:
${HISTORY.observed_patterns.map(p => '- ' + p).join('\n')}
`;

  if (cityData) {
    const r = Math.round(cityData.risk / cityData.total * 100);
    ctx += `\nCITY MATCH — "${cityKey}": ${cityData.risk} issues / ${cityData.total} orders = ${r}% risk rate`;
  }
  if (prodData) {
    const r = Math.round(prodData.risk / prodData.total * 100);
    ctx += `\nPRODUCT MATCH — "${prodKey}": ${prodData.risk} issues / ${prodData.total} orders = ${r}% risk rate`;
  }
  if (signals.length) {
    ctx += `\n\n⚠ RISK SIGNALS DETECTED:\n${signals.map(s => '  • ' + s).join('\n')}`;
  }

  ctx += `\n=== USE THIS REAL DATA TO CALIBRATE YOUR PREDICTION ===`;
  return ctx;
}

// ─── POST /api/analyze-cod ───────────────────────────
app.post('/api/analyze-cod', async (req, res) => {
  const {
    name = 'Unknown', orderValue, payment,
    prevOrders, prevCancel, city, product,
    source, notes, address = ''
  } = req.body;

  if (!orderValue || !payment) {
    return res.status(400).json({ error: 'orderValue aur payment required hai' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: '.env mein GROQ_API_KEY set nahi hai' });
  }

  const historyContext = buildContext(city, product, notes, address);

  const prompt = `${historyContext}

=== NEW ORDER TO ANALYZE ===
- Customer: ${name}
- Order Value: Rs.${orderValue}
- Payment: ${payment}
- Previous Orders with Proskii: ${prevOrders || 0}
- Previous Cancellations: ${prevCancel || 0}
- City/State: ${city || 'Unknown'}
- Product: ${product || 'Not specified'}
- Traffic Source: ${source || 'Unknown'}
- Address: ${address || 'Not provided'}
- Call Notes: ${notes || 'None'}

Based on Proskii's REAL historical data above, predict this COD order's cancellation risk.
Reference specific patterns from the data in your reasoning.

Respond ONLY with raw valid JSON (no markdown, no backticks):
{"riskScore":<0-100>,"riskLevel":"Low|Medium|High","category":"Fitness Enthusiast|Weight Loss Seeker|Healthy Breakfast Buyer|Curious First-Timer|Gifting Customer","buyerType":"one line description","actions":["action1","action2","action3"],"reasoning":"2-3 sentences referencing Proskii actual data patterns"}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: 'system', content: 'You are a COD risk analyzer. Respond only with valid JSON, no markdown.' },
        { role: 'user', content: prompt }
      ],
    });

    const rawText = completion.choices[0]?.message?.content || '';
    console.log('Groq response:', rawText.substring(0, 150));

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Valid JSON nahi mila');

    const data = JSON.parse(jsonMatch[0]);
    return res.json({ success: true, data });

  } catch (err) {
    console.error('Groq error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /health ─────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status:          'ok',
  training_orders: HISTORY.total_orders,
  risk_rate:       HISTORY.risk_rate_pct + '%',
  model:           'gemini-1.5-flash-latest',
  api_key_set:     !!process.env.GROQ_API_KEY,
}));

app.listen(PORT, () => {
  console.log(`✅ Proskii backend: http://localhost:${PORT}`);
  console.log(`   Model: llama-3.3-70b-versatile`);
  console.log(`   API Key: ${process.env.GROQ_API_KEY ? '✅ set' : '❌ MISSING!'}`);
});
