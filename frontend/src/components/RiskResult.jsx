import { useEffect, useRef } from 'react'

const COLORS = { High: '#ff3b5c', Medium: '#ffb547', Low: '#00d4aa' }

export default function RiskResult({ result }) {
  const meterRef = useRef(null)

  const color = COLORS[result.riskLevel] || '#ff6b35'
  const levelLower = (result.riskLevel || '').toLowerCase()

  useEffect(() => {
    const t = setTimeout(() => {
      if (meterRef.current) {
        meterRef.current.style.width = result.riskScore + '%'
        meterRef.current.style.background = color
      }
    }, 100)
    return () => clearTimeout(t)
  }, [result.riskScore, color])

  return (
    <div style={{ animation: 'slideUp 0.4s ease' }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .badge-high   { background: rgba(255,59,92,0.15);  color: #ff3b5c; border: 1px solid rgba(255,59,92,0.3); }
        .badge-medium { background: rgba(255,181,71,0.15); color: #ffb547; border: 1px solid rgba(255,181,71,0.3); }
        .badge-low    { background: rgba(0,212,170,0.15);  color: #00d4aa; border: 1px solid rgba(0,212,170,0.3); }
      `}</style>

      {/* Risk Score Card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '1.5rem', marginBottom: '1rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3, background: color,
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            COD Cancellation Risk
          </span>
          <span className={`badge-${levelLower}`} style={{
            padding: '0.3rem 0.8rem', borderRadius: 100,
            fontFamily: 'var(--mono)', fontSize: '0.7rem',
            fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {result.riskLevel} Risk
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', color }}>
            {result.riskScore}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem', fontFamily: 'var(--mono)' }}>
              Risk Score / 100
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              Higher = More likely to cancel
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 100, overflow: 'hidden', marginBottom: '0.4rem' }}>
          <div ref={meterRef} style={{ height: '100%', borderRadius: 100, width: '0%', transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)' }}>
          <span>Low Risk</span><span>Medium</span><span>High Risk</span>
        </div>
      </div>

      {/* Category + Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.2rem' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
            Customer Category
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)',
            borderRadius: 8, padding: '0.5rem 0.8rem',
            fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)',
            marginBottom: '0.7rem',
          }}>
            {result.category}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {result.buyerType}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.2rem' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
            Recommended Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(result.actions || []).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)', marginTop: 5, flexShrink: 0 }} />
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.2rem' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
          AI Reasoning
        </div>
        <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: '#c0c0d8' }}>
          {result.reasoning}
        </div>
      </div>
    </div>
  )
}
