/**
 * Gradient Calculation Page
 *
 * Real-world formulas:
 *   Gradient %   = (Rise / Run) × 100
 *   Angle (°)    = atan(Rise / Run) × (180 / π)
 *   Ratio (1:N)  = Run / Rise
 *   Slope length = √(Rise² + Run²)
 *   mm per metre = (Rise / Run) × 1000
 */
import { useState } from 'react'
import {
  TrendingUp, RefreshCw, CheckCircle, AlertTriangle, XCircle, Info,
} from 'lucide-react'
import { gradientApi } from '../api/gradientApi'

// ─── IRC road gradient standards ─────────────────────────────────────────────
const IRC = [
  { terrain: 'Plain',       ruling: { pct: 3.33, n: 30 }, limiting: { pct: 5.00, n: 20 }, exceptional: { pct: 6.67, n: 15 } },
  { terrain: 'Rolling',     ruling: { pct: 5.00, n: 20 }, limiting: { pct: 6.00, n: 17 }, exceptional: { pct: 7.00, n: 14 } },
  { terrain: 'Mountainous', ruling: { pct: 5.00, n: 20 }, limiting: { pct: 6.00, n: 17 }, exceptional: { pct: 7.00, n: 14 } },
  { terrain: 'Steep',       ruling: { pct: 6.00, n: 17 }, limiting: { pct: 7.00, n: 14 }, exceptional: { pct: 8.00, n: 13 } },
]

// ─── helpers ─────────────────────────────────────────────────────────────────
const r = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d
const toDeg = rad => rad * 180 / Math.PI

function compute(rise, run) {
  if (!rise || !run || +run === 0 || +rise < 0 || +run < 0) return null
  const ri = +rise, ru = +run
  return {
    rise:     ri,
    run:      ru,
    pct:      r((ri / ru) * 100),
    deg:      r(toDeg(Math.atan(ri / ru))),
    ratioN:   r(ru / ri),
    length:   r(Math.sqrt(ri * ri + ru * ru)),
    mmPerM:   r((ri / ru) * 1000),
  }
}

function grade(pct) {
  if (pct < 0.5)  return { label: 'Flat / Level',  color: '#3B82F6', bg: '#EFF6FF' }
  if (pct < 3.34) return { label: 'Gentle',         color: '#10B981', bg: '#ECFDF5' }
  if (pct < 5.01) return { label: 'Moderate',       color: '#F59E0B', bg: '#FFFBEB' }
  if (pct < 7.01) return { label: 'Steep',          color: '#EF4444', bg: '#FEF2F2' }
  return               { label: 'Very Steep',       color: '#7C3AED', bg: '#F5F3FF' }
}

// ─── tiny shared UI ───────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #E2E8F0',
  borderRadius: 9, fontSize: 15, color: '#1E2D4A', outline: 'none',
  background: '#F8FAFC', boxSizing: 'border-box',
}
const lbl = { fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '.4px' }

function Row({ label, value, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: 13, color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: big ? 20 : 14, fontWeight: big ? 800 : 600, color: big ? '#FD5C02' : '#1E2D4A', fontFamily: 'monospace' }}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function GradientCalculation() {
  const [rise,    setRise]    = useState('')
  const [run,     setRun]     = useState('')
  const [useCase, setUseCase] = useState('General')
  const [terrain, setTerrain] = useState('Plain')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  const result = compute(rise, run)
  const g      = result ? grade(result.pct) : null

  // IRC check for road use case
  const ircRow  = IRC.find(r => r.terrain === terrain)
  let ircStatus = null
  if (result && useCase === 'Road' && ircRow) {
    if (result.pct <= ircRow.ruling.pct)      ircStatus = { label: `✅ Within Ruling Gradient (≤ ${ircRow.ruling.pct}%)`,       color: '#10B981' }
    else if (result.pct <= ircRow.limiting.pct)    ircStatus = { label: `⚠️ Within Limiting Gradient (≤ ${ircRow.limiting.pct}%)`,   color: '#F59E0B' }
    else if (result.pct <= ircRow.exceptional.pct) ircStatus = { label: `🔺 Within Exceptional Gradient (≤ ${ircRow.exceptional.pct}%)`, color: '#EF4444' }
    else                                           ircStatus = { label: `❌ Exceeds Exceptional Gradient for ${terrain} terrain`,  color: '#7C3AED' }
  }

  // ADA ramp check
  let adaStatus = null
  if (result && useCase === 'Ramp') {
    adaStatus = result.pct <= 8.33
      ? { label: '✅ ADA Compliant — within 1:12 (8.33%) limit', color: '#10B981' }
      : { label: '❌ Too steep for wheelchair ramp — max is 1:12 (8.33%)', color: '#EF4444' }
  }

  // Drainage check
  let drainStatus = null
  if (result && useCase === 'Drainage') {
    if (result.pct < 0.91)       drainStatus = { label: '❌ Too flat — risk of blockage (needs > 1:110)', color: '#EF4444' }
    else if (result.pct <= 2.5)  drainStatus = { label: '✅ Good drainage gradient (1:40 – 1:110)',       color: '#10B981' }
    else                         drainStatus = { label: '⚠️ Steeper than usual — check flow velocity',    color: '#F59E0B' }
  }

  const reset = () => { setRise(''); setRun(''); setSaved(false) }

  const saveCalc = async () => {
    if (!result || saving) return
    setSaving(true)
    try {
      await gradientApi.save({
        rise: result.rise, run: result.run, input_mode: 'rise_run',
        use_case: useCase, terrain,
        gradient_pct: result.pct, angle_deg: result.deg,
        ratio_n: result.ratioN, slope_length: result.length, mm_per_metre: result.mmPerM,
      })
      setSaved(true)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const USE_CASES = ['General', 'Road', 'Drainage', 'Ramp', 'Roof', 'Landscaping']

  return (
    <>
      {/* breadcrumb */}
      <div className="breadcrumb">
        <span>Tools</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Gradient Calculation</span>
      </div>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={22} color="#FD5C02" /> Gradient Calculation
          </div>
          <div className="page-desc">Calculate slope % · angle · 1:N ratio from Rise and Run</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={13} /> Reset
          </button>
          {result && (
            <button onClick={saveCalc} disabled={saving || saved} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: saved ? '#10B981' : 'linear-gradient(135deg,#FD5C02,#FE7722)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving || saved ? 'default' : 'pointer', opacity: saving ? .7 : 1 }}>
              {saved ? '✅ Saved' : saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Inputs ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Main inputs */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2D4A', marginBottom: 16 }}>📐 Enter Rise and Run</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Vertical Rise (m)</label>
                <input style={inputStyle} type="number" min="0" step="any" placeholder="e.g.  3" value={rise} onChange={e => setRise(e.target.value)} />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>How much it goes UP</div>
              </div>
              <div>
                <label style={lbl}>Horizontal Run (m)</label>
                <input style={inputStyle} type="number" min="0" step="any" placeholder="e.g. 100" value={run} onChange={e => setRun(e.target.value)} />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>How far it goes FORWARD</div>
              </div>
            </div>

            {/* formula hint */}
            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                <strong>Formula:</strong> &nbsp; Gradient % = (Rise ÷ Run) × 100
              </div>
              {rise && run && +run > 0 && (
                <div style={{ fontSize: 12, color: '#FD5C02', fontWeight: 700, marginTop: 4, fontFamily: 'monospace' }}>
                  = ({rise} ÷ {run}) × 100 = {r((+rise / +run) * 100)}%
                </div>
              )}
            </div>
          </div>

          {/* Use case */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2D4A', marginBottom: 12 }}>🏗️ Use Case</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {USE_CASES.map(u => (
                <button key={u} onClick={() => setUseCase(u)} style={{
                  padding: '8px 14px', borderRadius: 8, border: `2px solid ${useCase === u ? '#FD5C02' : '#E2E8F0'}`,
                  background: useCase === u ? '#FFF3EC' : '#fff', color: useCase === u ? '#FD5C02' : '#64748B',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>{u}</button>
              ))}
            </div>
          </div>

          {/* Terrain (road only) */}
          {useCase === 'Road' && (
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2D4A', marginBottom: 12 }}>🛣️ Terrain (IRC Standard)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {IRC.map(row => (
                  <button key={row.terrain} onClick={() => setTerrain(row.terrain)} style={{
                    padding: '8px 14px', borderRadius: 8, border: `2px solid ${terrain === row.terrain ? '#FD5C02' : '#E2E8F0'}`,
                    background: terrain === row.terrain ? '#FFF3EC' : '#fff', color: terrain === row.terrain ? '#FD5C02' : '#64748B',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}>{row.terrain}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Results ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Result card */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2D4A', marginBottom: 16 }}>📊 Result</div>

            {!result ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#CBD5E1' }}>
                <TrendingUp size={44} style={{ opacity: .3, marginBottom: 10 }} />
                <div style={{ fontSize: 14 }}>Enter Rise and Run on the left</div>
              </div>
            ) : (
              <>
                {/* big gradient % */}
                <div style={{ textAlign: 'center', padding: '16px 0 20px', borderBottom: '1px solid #F1F5F9', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>Gradient</div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#FD5C02', lineHeight: 1 }}>{result.pct}%</div>
                  <div style={{ marginTop: 10, display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: g.bg, color: g.color, fontWeight: 700, fontSize: 13, border: `1.5px solid ${g.color}30` }}>
                    {g.label}
                  </div>
                </div>

                <Row label="Angle"           value={`${result.deg}°`} />
                <Row label="Ratio (1 : N)"   value={`1 : ${result.ratioN}`} />
                <Row label="Slope Length"    value={`${result.length} m`} />
                <Row label="Fall per metre"  value={`${result.mmPerM} mm/m`} />

                {/* compliance status */}
                {(ircStatus || adaStatus || drainStatus) && (
                  <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 9, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    {[ircStatus, adaStatus, drainStatus].filter(Boolean).map((s, i) => (
                      <div key={i} style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* IRC reference table (always visible) */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2D4A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Info size={14} color="#FD5C02" /> IRC Gradient Reference
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Terrain</th><th>Ruling</th><th>Limiting</th><th>Exceptional</th></tr>
                </thead>
                <tbody>
                  {IRC.map(row => (
                    <tr key={row.terrain} style={{ background: row.terrain === terrain && useCase === 'Road' ? '#FFF7F3' : 'inherit' }}>
                      <td style={{ fontWeight: row.terrain === terrain && useCase === 'Road' ? 700 : 400 }}>{row.terrain}</td>
                      <td>1:{row.ruling.n} ({row.ruling.pct}%)</td>
                      <td>1:{row.limiting.n} ({row.limiting.pct}%)</td>
                      <td>1:{row.exceptional.n} ({row.exceptional.pct}%)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick reference */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2D4A', marginBottom: 12 }}>📌 Quick Reference</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Flat (drainage concern)',   val: '< 0.5%',      color: '#3B82F6' },
                { label: 'Gentle slope',              val: '0.5% – 3.3%', color: '#10B981' },
                { label: 'Moderate slope',            val: '3.3% – 5%',   color: '#F59E0B' },
                { label: 'Steep slope',               val: '5% – 7%',     color: '#EF4444' },
                { label: 'Very steep',                val: '> 7%',        color: '#7C3AED' },
                { label: 'ADA Ramp maximum',          val: '8.33% (1:12)', color: '#FD5C02' },
                { label: 'Drainage pipe (typical)',   val: '1.25% (1:80)', color: '#64748B' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#F8FAFC', borderRadius: 7 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
