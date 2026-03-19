import { useState } from 'react'
import RiskResult from './RiskResult'
import { DEMOS, PRODUCTS, SOURCES } from '../data/constants'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api/analyze-cod'

const EMPTY_FORM = {
  name: '', orderValue: '', payment: 'COD',
  prevOrders: '', prevCancel: '', city: '',
  product: PRODUCTS[0], source: SOURCES[0],
  address: '', notes: '',
}

export default function SmartSalesHelper() {
  const [form, setForm]       = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function fillDemo(type) {
    setForm({ ...EMPTY_FORM, ...DEMOS[type] })
    setResult(null)
    setError('')
  }

  async function analyzeOrder() {
    if (!form.orderValue || !form.payment) {
      setError('Order value aur payment mode required hai')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res  = await fetch(BACKEND_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
    } catch (e) {
      setError(e.message || 'Backend se connect nahi ho pa raha. node server.js chala rahe ho?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 4rem', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Proskii Internal Tool
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Smart Sales <span style={{ color: 'var(--accent)' }}>Helper</span>
          </h1>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)',
          borderRadius: 100, padding: '0.4rem 0.9rem',
          fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--accent2)',
        }}>
          <div style={{
            width: 7, height: 7, background: 'var(--accent2)', borderRadius: '50%',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}`}</style>
          AI Active · 44 orders trained
        </div>
      </header>

      {/* Demo chips */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
          Quick Demo Orders →
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { key: 'risky',     label: '⚠️ High Risk COD' },
            { key: 'medium',    label: '🟡 Medium Risk' },
            { key: 'safe',      label: '✅ Safe Order' },
            { key: 'firsttime', label: '🆕 First-Time Buyer' },
          ].map(d => (
            <button key={d.key} onClick={() => fillDemo(d.key)} style={{
              padding: '0.4rem 0.8rem', background: 'var(--card)',
              border: '1px solid var(--border)', borderRadius: 8,
              fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer',
              fontFamily: 'var(--mono)', transition: 'all 0.2s',
            }}
              onMouseOver={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)' }}
              onMouseOut={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--muted)' }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>
          Order Details
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <Field label="Customer Name">
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ramesh Kumar" />
          </Field>
          <Field label="Order Value (₹)">
            <input type="number" value={form.orderValue} onChange={e => set('orderValue', e.target.value)} placeholder="799" />
          </Field>
          <Field label="Payment Mode">
            <select value={form.payment} onChange={e => set('payment', e.target.value)}>
              <option>COD</option>
              <option>Prepaid</option>
            </select>
          </Field>
          <Field label="Previous Orders">
            <input type="number" value={form.prevOrders} onChange={e => set('prevOrders', e.target.value)} placeholder="0" min="0" />
          </Field>
          <Field label="Previous Cancellations">
            <input type="number" value={form.prevCancel} onChange={e => set('prevCancel', e.target.value)} placeholder="0" min="0" />
          </Field>
          <Field label="City / State">
            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Nagpur, Maharashtra" />
          </Field>
          <Field label="Product">
            <select value={form.product} onChange={e => set('product', e.target.value)}>
              {PRODUCTS.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <select value={form.source} onChange={e => set('source', e.target.value)}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {/* Full width fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
          <Field label="Address Line 1" full>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. 0-/, House no 12 Road 25, New Delhi..." />
          </Field>
          <Field label="Call Notes (optional)" full>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Didn't pick up, asked return policy, hotel address..." rows={3} />
          </Field>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#ff3b5c', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <button
          onClick={analyzeOrder}
          disabled={loading}
          style={{
            width: '100%', padding: '0.9rem',
            background: loading ? 'rgba(255,107,53,0.5)' : 'var(--accent)',
            border: 'none', borderRadius: 12, color: '#fff',
            fontFamily: 'var(--font)', fontSize: '1rem', fontWeight: 700,
            letterSpacing: '0.03em', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'all 0.2s',
          }}
        >
          {loading ? (
            <>
              <span style={{
                display: 'inline-block', width: 18, height: 18,
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                borderRadius: '50%', animation: 'spin 0.7s linear infinite',
              }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              Analyzing...
            </>
          ) : 'Analyze COD Risk'}
        </button>
      </div>

      {/* Result */}
      {result && <RiskResult result={result} />}
    </div>
  )
}

// Reusable Field wrapper
function Field({ label, children, full }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <style>{`
        input, select, textarea {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.7rem 0.9rem;
          color: var(--text);
          font-family: var(--font);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(255,107,53,0.1);
        }
        select option { background: var(--card); }
        textarea { resize: none; font-size: 0.85rem; }
      `}</style>
      {children}
    </div>
  )
}
