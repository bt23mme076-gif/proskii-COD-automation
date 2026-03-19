require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors({ origin: '*' }));
app.use(express.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

// ─── Load historical CSV training data ───────────────
// CSV se nikali summary — ye AI ko real Proskii patterns sikhata hai
const PROSKII_HISTORY = {
  total_orders: 44,
  risk_rate_pct: 32,
  common_issues: {
    incomplete_address: 4,   // "0-/" wale addresses
    no_call_pickup: 4,        // customer ne phone nahi uthaya
    institutional_address: 3, // hospital/hostel/hotel
    junk_address: 1,
    whatsapp_fallback: 2,
    hotel_address: 1
  },
  // City wise risk (cancelled/total)
  city_risk: {
    "Ahmedabad": { risk: 1, total: 1 },
    "Jalandhar": { risk: 1, total: 2 },
    "Ludhiana":  { risk: 1, total: 3 },
    "Delhi":     { risk: 1, total: 6 },
    "Mumbai":    { risk: 0, total: 4 },
    "Pune":      { risk: 0, total: 2 },
    "Gurgaon":   { risk: 0, total: 3 },
    "Bangalore": { risk: 0, total: 2 },
    "Hyderabad": { risk: 1, total: 3 },
  },
  // Product wise risk
  product_risk: {
    "Variety Pack (4-pack)": { risk: 3, total: 18 },
    "Double Chocolate - 2-pack": { risk: 2, total: 9 },
    "Founders' Pick": { risk: 1, total: 8 },
    "Mocha Madness": { risk: 1, total: 4 },
    "Peanut Butter - 2-pack": { risk: 0, total: 3 },
    "Honey Crunch - 2-pack": { risk: 0, total: 3 },
  },
  // Patterns jo Proskii ne observe kiye hain
  observed_patterns: [
    "Address starting with '0-/' = Shopify incomplete autofill = HIGH risk of NDR",
    "Hotel/hospital/hostel address = delivery failure risk if no one present",
    "Customer didn't pick up call = 60% chance of RTO",
    "Confirmation 'N' = certain cancel",
    "Ludhiana + Punjab orders had 1 cancellation out of 3 (33% risk)",
    "Mumbai + MH orders = 0 cancellations out of 4 (low risk zone)",
    "Instagram Ad first-time buyers = higher cancel rate than referrals",
    "Orders with updated/corrected address = usually safe after confirmation",
    "Pincode missing or mismatched = moderate NDR risk",
    "WhatsApp fallback confirmation orders = slightly higher risk than direct call confirm"
  ]
};

// ─── Build context string for AI prompt ──────────────
function buildHistoryContext(orderCity, orderProduct, orderNotes, orderAddr) {
  const addr = (orderAddr || '').toLowerCase();
  const notes = (orderNotes || '').toLowerCase();
  
  // Find similar city data
  const cityKey = Object.keys(PROSKII_HISTORY.city_risk).find(c => 
    orderCity && orderCity.toLowerCase().includes(c.toLowerCase())
  );
  const cityData = cityKey ? PROSKII_HISTORY.city_risk[cityKey] : null;
  
  // Find similar product data
  const prodKey = Object.keys(PROSKII_HISTORY.product_risk).find(p =>
    orderProduct && orderProduct.toLowerCase().includes(p.toLowerCase().split(' ')[0])
  );
  const prodData = prodKey ? PROSKII_HISTORY.product_risk[prodKey] : null;

  // Active risk signals for this order
  const signals = [];
  if (addr.startsWith('0-/'))    signals.push("ADDRESS STARTS WITH '0-/' — in Proskii history, 4/4 such orders had delivery issues");
  if (addr.includes('hotel'))    signals.push("HOTEL ADDRESS — 1 such order in history, needed extra confirmation");
  if (addr.includes('hospital') || addr.includes('hostel')) signals.push("INSTITUTIONAL ADDRESS — 3 such orders in history had NDR risk");
  if (notes.includes("pick up")) signals.push("NO CALL PICKUP — 4/4 such orders in Proskii data had follow-up issues");
  if (notes.includes('whatsapp'))signals.push("WHATSAPP FALLBACK — slightly higher risk in Proskii history");

  let ctx = `=== PROSKII REAL ORDER HISTORY (${PROSKII_HISTORY.total_orders} past orders) ===
Overall cancel/risk rate: ${PROSKII_HISTORY.risk_rate_pct}% of orders had some issue.

KEY PATTERNS FROM PROSKII'S ACTUAL DATA:
${PROSKII_HISTORY.observed_patterns.map(p => '- ' + p).join('\n')}
`;

  if (cityData) {
    const cityRisk = Math.round(cityData.risk / cityData.total * 100);
    ctx += `\nCITY MATCH — ${cityKey}: ${cityData.risk} issues out of ${cityData.total} orders (${cityRisk}% risk rate in Proskii history)`;
  }
  if (prodData) {
    const prodRisk = Math.round(prodData.risk / prodData.total * 100);
    ctx += `\nPRODUCT MATCH — ${prodKey}: ${prodData.risk} issues out of ${prodData.total} orders (${prodRisk}% risk rate in Proskii history)`;
  }
  if (signals.length > 0) {
    ctx += `\n\nRISK SIGNALS DETECTED FOR THIS ORDER:\n${signals.map(s => '⚠ ' + s).join('\n')}`;
  }
  
  ctx += `\n=== USE THIS HISTORY TO CALIBRATE YOUR PREDICTION ===`;
  return ctx;
}

// ─── POST /api/analyze-cod ───────────────────────────
app.post('/api/analyze-cod', async (req, res) => {
  const {
    name = 'Unknown', orderValue, payment,
    prevOrders, prevCancel, city, product, source, notes,
    address = ''
  } = req.body;

  if (!orderValue || !payment) {
    return res.status(400).json({ error: 'orderValue aur payment required hai' });
  }

  // Build history context using real Proskii data
  const historyContext = buildHistoryContext(city, product, notes, address);

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
- Address snippet: ${address || 'Not provided'}
- Call Notes: ${notes || 'None'}

Based on Proskii's REAL historical data above, predict this order's COD cancellation risk.
Be specific — reference the actual patterns from Proskii's history in your reasoning.

Respond ONLY with raw valid JSON, no markdown, no backticks:
{"riskScore":<0-100>,"riskLevel":"Low|Medium|High","category":"Fitness Enthusiast|Weight Loss Seeker|Healthy Breakfast Buyer|Curious First-Timer|Gifting Customer","buyerType":"one line","actions":["action1","action2","action3"],"reasoning":"2-3 sentences referencing Proskii actual data patterns"}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://proskii.com',
        'X-Title': 'Proskii Smart Sales Helper',
      },
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [
          { role: 'system', content: 'You are a COD risk analyzer trained on Proskii\'s real order data. Reference actual patterns in reasoning. Respond only with valid JSON, no markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    const json = await response.json();
    if (json.error) return res.status(500).json({ error: json.error.message });

    const rawText = json.choices?.[0]?.message?.content || '';
    const clean = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return res.json({ success: true, data: result });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: 'Analysis fail ho gayi' });
  }
});

app.get('/health', (req, res) => res.json({ 
  status: 'ok', 
  training_orders: PROSKII_HISTORY.total_orders,
  model: FREE_MODEL 
}));

app.listen(PORT, () => {
  console.log(`✅ Proskii backend: http://localhost:${PORT}`);
  console.log(`   Training data: ${PROSKII_HISTORY.total_orders} real orders loaded`);
  console.log(`   Model: ${FREE_MODEL}`);
});
