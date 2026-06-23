import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];
const QUARTERS = [
  { value: 1, label: 'Q1 (Jan-Mar)' }, { value: 2, label: 'Q2 (Apr-Jun)' },
  { value: 3, label: 'Q3 (Jul-Sep)' }, { value: 4, label: 'Q4 (Oct-Dec)' },
];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

// Helper for large numbers formatting
function fmt(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toFixed(0);
}

// Percent formatter
function pctChange(cy, py) {
  if (cy == null || py == null) return null;
  const c = Number(cy);
  const p = Number(py);
  if (p === 0) return c > 0 ? '+100%' : '0%';
  const diff = ((c - p) / p) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}

function getPeriodLabel(period, months, quarters, year) {
  if (period === 'yearly') return `Year ${year}`;
  if (period === 'quarterly') {
    const s = [...quarters].sort((a, b) => a - b);
    return s.length === 1 ? `Q${s[0]} ${year}` : s.map(q => `Q${q}`).join(', ') + ` ${year}`;
  }
  const s = [...months].sort((a, b) => a - b);
  return s.length === 1 ? `${MONTHS.find(m => m.value === s[0])?.label} ${year}` : s.map(m => MONTHS.find(x => x.value === m)?.label?.slice(0, 3)).join(', ') + ` ${year}`;
}

function buildLineData(period, months, quarters, year) {
  if (period === 'yearly') return { Period: 'yearly', Months: '', Quarter: 0, Year: year };
  if (period === 'quarterly') {
    const s = [...quarters].sort((a, b) => a - b);
    const qm = s.flatMap(q => q === 1 ? [1, 2, 3] : q === 2 ? [4, 5, 6] : q === 3 ? [7, 8, 9] : [10, 11, 12]);
    return { Period: 'quarterly', Months: [...new Set(qm)].join(','), Quarter: s[0], Year: year };
  }
  return { Period: 'monthly', Months: [...months].sort((a, b) => a - b).join(','), Quarter: 0, Year: year };
}

// Multi-select dropdown
function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);
  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? options.find(o => o.value === selected[0])?.label
    : `${selected.length} selected`;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        height: 30, padding: '0 10px', fontSize: 12, border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-xs)', background: 'var(--surface)', color: 'var(--text)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 120, fontFamily: 'var(--font)'
      }}>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {selected.length > 1 && <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>{selected.length}</span>}
        <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 34, right: 0, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          zIndex: 100, minWidth: 160, boxShadow: 'var(--shadow-lg)', maxHeight: 240, overflowY: 'auto'
        }}>
          {options.map(o => (
            <div key={o.value} onClick={() => {
              const next = selected.includes(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value];
              onChange(next.length ? next : [o.value]);
            }} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12,
              cursor: 'pointer', color: selected.includes(o.value) ? 'var(--orange)' : 'var(--text)',
              fontWeight: selected.includes(o.value) ? 600 : 400,
              background: selected.includes(o.value) ? 'var(--orange-soft)' : 'transparent'
            }}>
              <input type="checkbox" checked={selected.includes(o.value)} readOnly style={{ accentColor: 'var(--orange)', width: 13, height: 13 }} />
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Side Drawer component for Client Detail
function ClientDrawer({ clientID, clientName, onClose }) {
  const [activeTab, setActiveTab] = useState('charging');
  const [data, setData] = useState({ charging: [], redemption: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientID) return;
    async function fetchClientDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await apiCall('Get Express Client Detail', { ClientID: clientID }, {}, true);
        setData({
          charging: res.List0 || [],
          redemption: res.List1 || []
        });
      } catch (err) {
        console.error(err);
        setError('Failed to load client details.');
      }
      setLoading(false);
    }
    fetchClientDetail();
  }, [clientID]);

  if (!clientID) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end'
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)'
      }}></div>

      {/* Content Container */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: '600px', height: '100%',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
        padding: '24px', overflow: 'hidden'
      }}>
        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>👤 {clientName || `Client #${clientID}`}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Detailed Card Activity & Redemptions</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'var(--soft)', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)'
          }}>✕</button>
        </div>

        {/* Mini stats cards inside Drawer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Charged Points</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>
              {fmt(data.charging.reduce((sum, r) => sum + Number(r.TotalPoints || 0), 0))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              From {data.charging.reduce((sum, r) => sum + Number(r.TotalCards || 0), 0)} cards
            </div>
          </div>
          <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Redeemed Points</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>
              {fmt(data.redemption.reduce((sum, r) => sum + Number(r.TotalPoint || 0), 0))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Across {data.redemption.reduce((sum, r) => sum + Number(r.TotalRequest || 0), 0)} requests
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 16, marginBottom: 16 }}>
          <button onClick={() => setActiveTab('charging')} style={{
            background: 'none', border: 'none', padding: '8px 4px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', color: activeTab === 'charging' ? 'var(--orange)' : 'var(--muted)',
            borderBottom: activeTab === 'charging' ? '2.5px solid var(--orange)' : 'none'
          }}>💳 Card Charging ({data.charging.length})</button>
          <button onClick={() => setActiveTab('redemption')} style={{
            background: 'none', border: 'none', padding: '8px 4px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', color: activeTab === 'redemption' ? 'var(--orange)' : 'var(--muted)',
            borderBottom: activeTab === 'redemption' ? '2.5px solid var(--orange)' : 'none'
          }}>🎁 Gift Redemptions ({data.redemption.length})</button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner"></div></div>
          ) : error ? (
            <div className="err-page">{error}</div>
          ) : activeTab === 'charging' ? (
            data.charging.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>No charging history found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                    <th style={{ padding: '8px 6px' }}>Period</th>
                    <th style={{ padding: '8px 6px' }}>Card Type</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Cards</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.charging.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 600 }}>{MONTHS.find(m => m.value === r.ChargingMonth)?.label.slice(0, 3)} {r.ChargingYear}</td>
                      <td style={{ padding: '10px 6px' }}>
                        <span style={{
                          background: 'var(--soft)', border: '1px solid var(--border)',
                          padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700
                        }}>{r.CardType || 'Default'}</span>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{r.TotalCards}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{fmt(r.TotalPoints)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            data.redemption.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>No redemption history found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                    <th style={{ padding: '8px 6px' }}>Period</th>
                    <th style={{ padding: '8px 6px' }}>Gift Name</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Requests</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.redemption.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 600 }}>{MONTHS.find(m => m.value === r.RedemptionMonth)?.label.slice(0, 3)} {r.RedemptionYear}</td>
                      <td style={{ padding: '10px 6px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.GiftName}>🎁 {r.GiftName}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{r.GiftAmount}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{r.TotalRequest}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmt(r.TotalPoint)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExpressDetail({ user, lineData: initLineData, periodLabel: initPeriodLabel, onBack, controlData }) {
  const now = new Date();
  const init = initLineData || {};
  const [period, setPeriod] = useState(init.Period || 'monthly');
  const [months, setMonths] = useState(init.Months ? init.Months.split(',').map(Number) : [now.getMonth() + 1]);
  const [quarters, setQuarters] = useState([init.Quarter || Math.ceil((now.getMonth() + 1) / 3)]);
  const [year, setYear] = useState(init.Year || now.getFullYear());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Main KPI stats (CY vs PY)
  const [summary, setSummary] = useState(null);
  // Month-by-month trends
  const [trends, setTrends] = useState([]);
  // Top gifts
  const [gifts, setGifts] = useState([]);
  // Card type performance
  const [cardTypes, setCardTypes] = useState([]);
  // Top clients list
  const [clients, setClients] = useState([]);

  // Client Drawer state
  const [selectedClientID, setSelectedClientID] = useState(null);
  const [selectedClientName, setSelectedClientName] = useState('');

  const periodLabel = getPeriodLabel(period, months, quarters, year);
  const lineData = buildLineData(period, months, quarters, year);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('Get Express Details By Period', lineData, {}, true);
      setSummary(d.List0?.[0] || null);
      setTrends(d.List1 || []);
      setGifts(d.List2 || []);
      setCardTypes(d.List3 || []);
      setClients(d.List4 || []);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error loading Express dashboard data');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [period, months, quarters, year]);

  // Derived KPI ratios
  const cyCardActiveRatio = summary ? ((Number(summary.CY_ActiveCards) / Math.max(1, Number(summary.CY_ChargingCards))) * 100).toFixed(1) : null;
  const pyCardActiveRatio = summary ? ((Number(summary.PY_ActiveCards) / Math.max(1, Number(summary.PY_ChargingCards))) * 100).toFixed(1) : null;

  const cyChargingAvg = summary && Number(summary.CY_ChargingCards) > 0 ? (Number(summary.CY_ChargingPoints) / Number(summary.CY_ChargingCards)).toFixed(0) : null;
  const pyChargingAvg = summary && Number(summary.PY_ChargingCards) > 0 ? (Number(summary.PY_ChargingPoints) / Number(summary.PY_ChargingCards)).toFixed(0) : null;

  // Max points for bar scales in leaderboards
  const maxGiftPoints = gifts.length > 0 ? Math.max(...gifts.map(g => Number(g.TotalPoints || 0))) : 1;
  const maxClientPoints = clients.length > 0 ? Math.max(...clients.map(c => Number(c.TotalChargedPoints || 0))) : 1;

  return (
    <div>
      {/* Header Card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              <span style={{ color: 'var(--orange)', cursor: 'pointer' }} onClick={onBack}>Control Page</span>
              <span style={{ margin: '0 6px' }}>›</span><span>Express Details</span>
            </div>
            <div className="page-title">💳 Express Loyalty Details</div>
          </div>
          <button className="btn-primary" onClick={load} style={{ height: 32, fontSize: 12 }}>🔄 Refresh</button>
        </div>
        
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '12px 0' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', border: '0.5px solid var(--border2)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
            {['monthly', 'quarterly', 'yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '5px 14px', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                background: period === p ? 'var(--orange)' : 'var(--surface)',
                color: period === p ? '#fff' : 'var(--muted)', fontWeight: period === p ? 600 : 400,
                textTransform: 'capitalize'
              }}>{p}</button>
            ))}
          </div>
          {period === 'monthly' && <MultiSelect options={MONTHS} selected={months} onChange={setMonths} placeholder="Select months" />}
          {period === 'quarterly' && <MultiSelect options={QUARTERS} selected={quarters} onChange={setQuarters} placeholder="Select quarters" />}
          <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{ height: 30, fontSize: 12 }}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)', background: 'var(--soft)', padding: '3px 10px', borderRadius: 999 }}>
          📅 {periodLabel}
        </div>
      </div>

      {error && <div className="err-page">⚠ {error}</div>}

      {/* KPI Cards Grid */}
      <div className="kpi-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {/* KPI 1: Charging */}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Point Charging</div>
            <div className="kpi-value" style={{ color: 'var(--orange)' }}>
              {summary ? fmt(summary.CY_ChargingPoints) : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Cards: {summary ? fmt(summary.CY_ChargingCards) : '0'}</span>
              {summary && (
                <span style={{
                  fontWeight: 700,
                  color: Number(summary.CY_ChargingPoints) >= Number(summary.PY_ChargingPoints) ? 'var(--green)' : 'var(--red)'
                }}>
                  {pctChange(summary.CY_ChargingPoints, summary.PY_ChargingPoints)} YoY
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
              Prior Year: {summary ? fmt(summary.PY_ChargingPoints) : '—'} pts
            </div>
          </>}
        </div>

        {/* KPI 2: Activation */}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Point Activation</div>
            <div className="kpi-value" style={{ color: 'var(--blue)' }}>
              {summary ? fmt(summary.CY_ActivePoints) : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Cards: {summary ? fmt(summary.CY_ActiveCards) : '0'}</span>
              {summary && (
                <span style={{
                  fontWeight: 700,
                  color: Number(summary.CY_ActivePoints) >= Number(summary.PY_ActivePoints) ? 'var(--green)' : 'var(--red)'
                }}>
                  {pctChange(summary.CY_ActivePoints, summary.PY_ActivePoints)} YoY
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
              Prior Year: {summary ? fmt(summary.PY_ActivePoints) : '—'} pts
            </div>
          </>}
        </div>

        {/* KPI 3: Redemptions */}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Gift Redemptions</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>
              {summary ? fmt(summary.CY_RedeemPoints) : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Requests: {summary ? fmt(summary.CY_RedeemRequests) : '0'}</span>
              {summary && (
                <span style={{
                  fontWeight: 700,
                  color: Number(summary.CY_RedeemPoints) >= Number(summary.PY_RedeemPoints) ? 'var(--green)' : 'var(--red)'
                }}>
                  {pctChange(summary.CY_RedeemPoints, summary.PY_RedeemPoints)} YoY
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
              Gifts Val: {summary ? fmt(summary.CY_RedeemAmount) : '—'} EGP
            </div>
          </>}
        </div>

        {/* KPI 4: Active Ratio & Performance */}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Active / Charged Cards</div>
            <div className="kpi-value" style={{ color: 'var(--text)' }}>
              {cyCardActiveRatio ? `${cyCardActiveRatio}%` : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Avg Chg: {cyChargingAvg ? `${cyChargingAvg} pts` : '—'}</span>
              {pyCardActiveRatio && (
                <span style={{
                  fontWeight: 700,
                  color: Number(cyCardActiveRatio) >= Number(pyCardActiveRatio) ? 'var(--green)' : 'var(--red)'
                }}>
                  {cyCardActiveRatio > pyCardActiveRatio ? '▲' : '▼'} vs PY ({pyCardActiveRatio}%)
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
              Prior Year Avg: {pyChargingAvg ? `${pyChargingAvg} pts` : '—'}
            </div>
          </>}
        </div>
      </div>

      {/* Main Panels Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 20 }}>
        
        {/* YoY Monthly Comparative Grid */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <span className="panel-title">📅 Monthly Point Charging & Activation YoY</span>
            <span className="badge badge-blue">CY vs PY Compare</span>
          </div>
          <div className="panel-body" style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
              trends.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No monthly comparative data available.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                      <th style={{ padding: '8px 10px' }}>Month</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>CY Charging</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>PY Charging</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>YoY Chg</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>CY Activation</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>PY Activation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((t, i) => {
                      const chargingGrowth = pctChange(t.CY_ChargingPoints, t.PY_ChargingPoints);
                      const isUp = !chargingGrowth?.startsWith('-');
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 10px', fontWeight: 700 }}>
                            {MONTHS.find(m => m.value === t.Month)?.label}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--orange)' }}>
                            {fmt(t.CY_ChargingPoints)}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)' }}>
                            {fmt(t.PY_ChargingPoints)}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: isUp ? 'var(--green)' : 'var(--red)' }}>
                            {chargingGrowth || '0%'}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--blue)' }}>
                            {fmt(t.CY_ActivePoints)}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)' }}>
                            {fmt(t.PY_ActivePoints)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>

        {/* Card Type Performance Table */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <span className="panel-title">💳 Card Type Breakdown</span>
            <span className="badge badge-amber">Cards & Points</span>
          </div>
          <div className="panel-body" style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
              cardTypes.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No card type performance data.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                      <th style={{ padding: '8px 6px' }}>Card Type</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Charged Pts</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Active Pts</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Cards (Act/Chg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardTypes.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 6px', fontWeight: 700 }}>
                          <span style={{
                            background: 'var(--orange-soft)', border: '1px solid var(--border)',
                            padding: '3px 8px', borderRadius: 6, fontSize: 11
                          }}>
                            {c.CardType || 'Default'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--orange)' }}>{fmt(c.TotalPointsCharged)}</td>
                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--blue)' }}>{fmt(c.TotalPointsActivated)}</td>
                        <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--muted)' }}>
                          {c.TotalCardsActivated} / {c.TotalCardsCharged}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>

      </div>

      {/* Gift Leaderboard and Top Clients Leaderboard side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        
        {/* Gift Redemption Leaderboard */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <span className="panel-title">🎁 Gift Redemption Leaderboard</span>
            <span className="badge badge-green">Top 25 Redeemed</span>
          </div>
          <div className="panel-body" style={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
            {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
              gifts.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No gift redemption records.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                      <th style={{ padding: '8px 6px' }}>Gift Name</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Requests</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Points</th>
                      <th style={{ padding: '8px 6px', minWidth: 80 }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gifts.map((g, i) => {
                      const sharePct = ((Number(g.TotalPoints) / maxGiftPoints) * 100);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 6px', fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.GiftName}>
                            🎁 {g.GiftName}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'right' }}>{g.TotalRequests}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmt(g.TotalPoints)}</td>
                          <td style={{ padding: '10px 6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ width: `${sharePct}%`, height: '100%', background: 'var(--green)', borderRadius: 999 }}></div>
                              </div>
                              <span style={{ fontSize: 9, color: 'var(--muted)', width: 24 }}>{sharePct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>

        {/* Top Clients Leaderboard */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <span className="panel-title">👥 Top Loyalty Clients</span>
            <span className="badge badge-amber">Click to view details</span>
          </div>
          <div className="panel-body" style={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
            {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
              clients.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No client loyalty records found.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                      <th style={{ padding: '8px 6px' }}>Client ID & Name</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Charged Pts</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Redeemed Pts</th>
                      <th style={{ padding: '8px 6px', minWidth: 80 }}>Charged Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c, i) => {
                      const sharePct = ((Number(c.TotalChargedPoints) / maxClientPoints) * 100);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => {
                          setSelectedClientID(c.ClientID);
                          setSelectedClientName(c.ClientName);
                        }}>
                          <td style={{ padding: '10px 6px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--orange)' }}>#{c.ClientID}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ClientName}</div>
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600 }}>{fmt(c.TotalChargedPoints)}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>{fmt(c.TotalRedeemedPoints)}</td>
                          <td style={{ padding: '10px 6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ width: `${sharePct}%`, height: '100%', background: 'var(--orange)', borderRadius: 999 }}></div>
                              </div>
                              <span style={{ fontSize: 9, color: 'var(--muted)', width: 24 }}>{sharePct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>

      </div>

      {/* Slide-out Client Details Drawer */}
      <ClientDrawer 
        clientID={selectedClientID} 
        clientName={selectedClientName}
        onClose={() => {
          setSelectedClientID(null);
          setSelectedClientName('');
        }}
      />
    </div>
  );
}
