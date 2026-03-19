export const DEMOS = {
  risky: {
    name: 'Aakash Singh', orderValue: '1499', payment: 'COD',
    prevOrders: '2', prevCancel: '2', city: 'Patna, Bihar',
    product: 'Protein Granola', source: 'Instagram Ad',
    address: '0-/, House number 7, Boring Road, Patna',
    notes: 'Customer asked about return policy before confirming',
  },
  medium: {
    name: 'Priya Sharma', orderValue: '1524', payment: 'COD',
    prevOrders: '1', prevCancel: '0', city: 'Indore, MP',
    product: 'Healthy Breakfast Mix', source: 'Facebook Ad',
    address: '355, Vishnupuri NX, Aditya Nagar Road',
    notes: "He didn't pick up the call",
  },
  safe: {
    name: 'Vikram Mehta', orderValue: '599', payment: 'COD',
    prevOrders: '5', prevCancel: '0', city: 'Pune, Maharashtra',
    product: 'Oats Energy Bar (Pack of 6)', source: 'Referral',
    address: '301, Tower 14, Nirvana Country, Sector 50',
    notes: 'Regular customer, confirmed on call',
  },
  firsttime: {
    name: 'Neha Gupta', orderValue: '699', payment: 'COD',
    prevOrders: '0', prevCancel: '0', city: 'Lucknow, UP',
    product: 'Weight Loss Snack Pack', source: 'Instagram Ad',
    address: 'Hotel Meenakshi, Hazratganj, Lucknow',
    notes: 'Saw a reel, first time buying. Staying at hotel.',
  },
}

export const PRODUCTS = [
  'Variety Pack (4-pack)',
  'Double Chocolate - 2-pack',
  'Honey Crunch - 2-pack',
  "Founders' Pick: Mocha + Double Chocolate",
  "Founders' Pick: Honey + Peanut Butter",
  'Mocha Madness - 2-pack',
  'Peanut Butter - 2-pack',
  'Protein Granola',
  'Weight Loss Snack Pack',
  'Oats Energy Bar (Pack of 6)',
]

export const SOURCES = [
  'Instagram Ad',
  'WhatsApp',
  'Organic / Website',
  'Referral',
  'Facebook Ad',
]

// Real Proskii CSV data — 44 orders ka summary
// Ye AI ko context deta hai prediction ke liye
export const PROSKII_HISTORY = {
  total_orders: 44,
  risk_rate_pct: 32,
  common_issues: {
    incomplete_address: 4,
    no_call_pickup: 4,
    institutional_address: 3,
    junk_address: 1,
    whatsapp_fallback: 2,
    hotel_address: 1,
  },
  city_risk: {
    Ahmedabad:      { risk: 1, total: 1 },
    Jalandhar:      { risk: 1, total: 2 },
    Ludhiana:       { risk: 1, total: 3 },
    Delhi:          { risk: 1, total: 6 },
    Mumbai:         { risk: 0, total: 4 },
    Pune:           { risk: 0, total: 2 },
    Gurgaon:        { risk: 0, total: 3 },
    Bangalore:      { risk: 0, total: 2 },
    Hyderabad:      { risk: 1, total: 3 },
  },
  product_risk: {
    'Variety Pack':       { risk: 3, total: 18 },
    'Double Chocolate':   { risk: 2, total: 9 },
    "Founders' Pick":     { risk: 1, total: 8 },
    'Mocha Madness':      { risk: 1, total: 4 },
    'Peanut Butter':      { risk: 0, total: 3 },
    'Honey Crunch':       { risk: 0, total: 3 },
  },
  observed_patterns: [
    "Address starting with '0-/' = Shopify incomplete autofill = HIGH risk of NDR",
    'Hotel/hospital/hostel address = delivery failure risk if no one present',
    "Customer didn't pick up call = 60% chance of RTO",
    "Confirmation 'N' = certain cancel",
    'Ludhiana + Punjab orders had 1 cancellation out of 3 (33% risk)',
    'Mumbai + MH orders = 0 cancellations out of 4 (low risk zone)',
    'Instagram Ad first-time buyers = higher cancel rate than referrals',
    'Orders with updated/corrected address = usually safe after confirmation',
    'Pincode missing or mismatched = moderate NDR risk',
    'WhatsApp fallback confirmation = slightly higher risk than direct call confirm',
  ],
}
