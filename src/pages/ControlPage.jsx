import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SalesDetail from './SalesDetail.jsx';
import PurchasingDetail from './PurchasingDetail.jsx';
import ExpensesDetail from './ExpensesDetail.jsx';
import CashDetail from './CashDetail.jsx';

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

function fmt(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toFixed(2);
}

function calcRatio(a, b) {
  if (!a || !b || Number(b) === 0) return null;
  return ((Number(a) / Number(b)) * 100).toFixed(1);
}

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
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 120,
        fontFamily: 'var(--font)'
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
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              fontSize: 12, cursor: 'pointer', color: selected.includes(o.value) ? 'var(--orange)' : 'var(--text)',
              fontWeight: selected.includes(o.value) ? 600 : 400,
              background: selected.includes(o.value) ? 'var(--orange-soft)' : 'transparent'
            }}>
              <input type="checkbox" checked={selected.includes(o.value)} readOnly
                style={{ accentColor: 'var(--orange)', width: 13, height: 13 }} />
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleSelect({ options, value, onChange }) {
  return (
    <select className="filter-select" value={value} onChange={e => onChange(Number(e.target.value) || e.target.value)}
      style={{ height: 30, fontSize: 12 }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function getPeriodLabel(period, months, quarters, year) {
  if (period === 'yearly') return `Year ${year}`;
  if (period === 'quarterly') {
    const sorted = [...quarters].sort((a, b) => a - b);
    return sorted.length === 1 ? `Q${sorted[0]} ${year}` : sorted.map(q => `Q${q}`).join(', ') + ` ${year}`;
  }
  const sorted = [...months].sort((a, b) => a - b);
  return sorted.length === 1
    ? `${MONTHS.find(m => m.value === sorted[0])?.label} ${year}`
    : sorted.map(m => MONTHS.find(x => x.value === m)?.label?.slice(0, 3)).join(', ') + ` ${year}`;
}

function buildLineData(period, months, quarters, year) {
  if (period === 'yearly') return { Period: 'yearly', Months: '', Quarter: 0, Year: year };
  if (period === 'quarterly') {
    const sorted = [...quarters].sort((a, b) => a - b);
    const qMonths = sorted.flatMap(q => {
      if (q === 1) return [1, 2, 3];
      if (q === 2) return [4, 5, 6];
      if (q === 3) return [7, 8, 9];
      return [10, 11, 12];
    });
    return { Period: 'quarterly', Months: [...new Set(qMonths)].join(','), Quarter: sorted[0], Year: year };
  }
  return { Period: 'monthly', Months: [...months].sort((a, b) => a - b).join(','), Quarter: 0, Year: year };
}

export default function ControlPage({ user }) {
  const now = new Date();
  const [period, setPeriod] = useState('monthly');
  const [months, setMonths] = useState([now.getMonth() + 1]);
  const [quarters, setQuarters] = useState([Math.ceil((now.getMonth() + 1) / 3)]);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [expressData, setExpressData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [cash, setCash] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('main');

  async function load() {
    setLoading(true); setError(''); setExpenses([]); setCash([]); setExpressData(null);
    try {
      const lineData = buildLineData(period, months, quarters, year);
      const op = 'Get Control Data By Period';
      const d = await apiCall(op, lineData);
      setData(d.List0?.[0] || null);
      setExpenses(d.List1 || []);
      setCash(d.List2 || []);
      
      try {
        const dExp = await apiCall(op, lineData, {}, true);
        setExpressData(dExp.List0?.[0] || null);
      } catch (eExp) {
        console.error('Express loading failed:', eExp);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [period, months, quarters, year]);

  const periodLabel = getPeriodLabel(period, months, quarters, year);
  const collRatio = calcRatio(data?.TotalCollection, data?.TotalSalesAmount);
  const payRatio = calcRatio(data?.TotalPaid, data?.TotalPurchasingAmount);
  const expressCardRatio = calcRatio(expressData?.TotalActiveCards, expressData?.TotalChargingCards);
  const expressPointRatio = calcRatio(expressData?.TotalActivePoints, expressData?.TotalChargingPoints);
  const lineData = buildLineData(period, months, quarters, year);

  if (view === 'cash') return (
    <CashDetail user={user} lineData={lineData} periodLabel={periodLabel} onBack={() => setView('main')} />
  );

  if (view === 'expenses') return (
    <ExpensesDetail user={user} lineData={lineData} periodLabel={periodLabel} onBack={() => setView('main')} controlData={data} />
  );

  if (view === 'sales') return (
    <SalesDetail user={user} lineData={lineData} periodLabel={periodLabel} onBack={() => setView('main')} controlData={data} />
  );
  if (view === 'purchasing') return (
    <PurchasingDetail user={user} lineData={lineData} periodLabel={periodLabel} onBack={() => setView('main')} controlData={data} />
  );

  return (
    <div>
      {/* Header Card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="page-title">📊 Control Page</div>
            <div className="page-sub">Sales, purchasing, expenses & cash overview</div>
          </div>
          <button className="btn-primary" onClick={load} style={{ height: 32, fontSize: 12 }}>🔄 Refresh</button>
        </div>

        <div style={{ height: '0.5px', background: 'var(--border)', margin: '12px 0' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
          {/* Period Toggle */}
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

          {/* Filters - right next to toggle */}
          {period === 'monthly' && (
            <MultiSelect options={MONTHS} selected={months} onChange={setMonths} placeholder="Select months" />
          )}
          {period === 'quarterly' && (
            <MultiSelect options={QUARTERS} selected={quarters} onChange={setQuarters} placeholder="Select quarters" />
          )}
          <SingleSelect
            options={YEARS.map(y => ({ value: y, label: String(y) }))}
            value={year}
            onChange={v => setYear(Number(v))}
          />
        </div>

        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)', background: 'var(--soft)', padding: '3px 10px', borderRadius: 999 }}>
          📅 {periodLabel}
        </div>
      </div>

      {error && <div className="err-page">⚠ {error}</div>}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 16, gridTemplateColumns: "repeat(5,1fr)" }}>
        {[
          { label: 'Total Sales', value: fmt(data?.TotalSalesAmount) },
          { label: 'Total Purchasing', value: fmt(data?.TotalPurchasingAmount) },
          { label: 'Customer Balance', value: fmt(data?.CustomerBalance) },
          { label: 'Vendor Balance', value: fmt(data?.VendorBalance) },
          { label: 'Total Expenses', value: fmt(expenses.reduce((s,e)=>s+Number(e.TotalAmount||0),0)) },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-change kpi-neu">{periodLabel}</div>
            </>}
          </div>
        ))}
      </div>

      {/* Panels */}
      <div className="section-grid" style={{gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))"}}>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title" style={{ cursor: 'pointer', color: 'var(--orange)' }} onClick={() => setView('sales')}>Sales ›</span>
            <span className={`badge ${Number(collRatio) >= 80 ? 'badge-green' : 'badge-amber'}`}>
              {collRatio ? (Number(collRatio) >= 80 ? 'On Track' : 'Below Target') : '—'}
            </span>
          </div>
          <div className="panel-body">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
              <div className="kpi-row"><span className="kpi-row-label">Total Sales</span><span className="kpi-row-val">{fmt(data?.TotalSalesAmount)}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Total Collection</span><span className="kpi-row-val">{fmt(data?.TotalCollection)}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Collection Ratio</span><span className={`kpi-row-val ${Number(collRatio) >= 80 ? 'kpi-up' : 'kpi-dn'}`}>{collRatio ? collRatio + '%' : '—'}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Customer Balance</span><span className="kpi-row-val">{fmt(data?.CustomerBalance)}</span></div>
            </>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title" style={{ cursor: 'pointer', color: 'var(--orange)' }} onClick={() => setView('purchasing')}>Purchasing ›</span>
            <span className={`badge ${Number(payRatio) >= 80 && Number(payRatio) <= 100 ? 'badge-green' : Number(payRatio) > 100 ? 'badge-red' : 'badge-amber'}`}>
              {payRatio ? (Number(payRatio) > 100 ? 'Over Paid' : Number(payRatio) >= 80 ? 'On Track' : 'Below Target') : '—'}
            </span>
          </div>
          <div className="panel-body">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
              <div className="kpi-row"><span className="kpi-row-label">Total Purchasing</span><span className="kpi-row-val">{fmt(data?.TotalPurchasingAmount)}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Total Paid</span><span className="kpi-row-val">{fmt(data?.TotalPaid)}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Payment Ratio</span><span className={`kpi-row-val ${Number(payRatio) >= 80 ? 'kpi-up' : 'kpi-dn'}`}>{payRatio ? payRatio + '%' : '—'}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Vendor Balance</span><span className="kpi-row-val">{fmt(data?.VendorBalance)}</span></div>
            </>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title" style={{cursor:"pointer",color:"var(--orange)"}} onClick={() => setView("expenses")}>Expenses ›</span>
            <span className="badge badge-amber">
              {expenses.length ? expenses.length + ' accounts' : '—'}
            </span>
          </div>
          <div className="panel-body">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> :
              expenses.length === 0 ? <div style={{padding:'16px 18px', color:'var(--muted)', fontSize:13}}>No data</div> :
              <>
                {expenses.map((e, i) => (
                  <div key={i} className="kpi-row">
                    <span className="kpi-row-label">{e.AccountDescription || e.Account}</span>
                    <span className="kpi-row-val">{fmt(e.TotalAmount)}</span>
                  </div>
                ))}
                <div className="kpi-row">
                  <span className="kpi-row-label" style={{fontWeight:700}}>Total Expenses</span>
                  <span className="kpi-row-val" style={{fontWeight:700}}>
                    {fmt(expenses.reduce((s, e) => s + Number(e.TotalAmount || 0), 0))}
                  </span>
                </div>
                <div className="kpi-row">
                  <span className="kpi-row-label" style={{fontWeight:700}}>Expenses / Sales</span>
                  <span className={`kpi-row-val ${
                    data?.TotalSalesAmount && expenses.length
                      ? (expenses.reduce((s,e)=>s+Number(e.TotalAmount||0),0) / Number(data.TotalSalesAmount) * 100) <= 15
                        ? 'kpi-up' : 'kpi-dn'
                      : ''
                  }`}>
                    {data?.TotalSalesAmount && expenses.length
                      ? (expenses.reduce((s,e)=>s+Number(e.TotalAmount||0),0) / Number(data.TotalSalesAmount) * 100).toFixed(1) + '%'
                      : '—'}
                  </span>
                </div>
              </>
            }
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title" style={{cursor:'pointer', color:'var(--orange)'}} onClick={() => setView('cash')}>Cash ›</span>
            <span className="badge badge-blue">Treasury & Bank</span>
          </div>
          <div className="panel-body">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> :
              cash.length === 0 ? <div style={{padding:'16px 18px', color:'var(--muted)', fontSize:13}}>No data</div> :
              (() => {
                const treasury = cash.find(c => c.AccountGroup === '126');
                const bank     = cash.find(c => c.AccountGroup === '127');
                const totalCurrent = Number(treasury?.CurrentBalance || 0) + Number(bank?.CurrentBalance || 0);
                const totalDiff = Number(treasury?.Difference || 0) + Number(bank?.Difference || 0);
                return <>
                  <div className="kpi-row">
                    <span className="kpi-row-label">Treasury Balance</span>
                    <span className="kpi-row-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {fmt(treasury?.CurrentBalance)}
                      <span style={{ fontSize: 11, color: Number(treasury?.Difference || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {Number(treasury?.Difference || 0) >= 0 ? '▲' : '▼'}
                      </span>
                    </span>
                  </div>
                  <div className="kpi-row">
                    <span className="kpi-row-label">Bank Balance</span>
                    <span className="kpi-row-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {fmt(bank?.CurrentBalance)}
                      <span style={{ fontSize: 11, color: Number(bank?.Difference || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {Number(bank?.Difference || 0) >= 0 ? '▲' : '▼'}
                      </span>
                    </span>
                  </div>
                  <div className="kpi-row">
                    <span className="kpi-row-label" style={{ fontWeight: 700 }}>Total Cash</span>
                    <span className="kpi-row-val" style={{ fontWeight: 700 }}>{fmt(totalCurrent)}</span>
                  </div>
                  <div className="kpi-row">
                    <span className="kpi-row-label" style={{ fontWeight: 700 }}>Net Movement</span>
                    <span className="kpi-row-val" style={{
                      fontWeight: 700,
                      color: totalDiff >= 0 ? 'var(--green)' : 'var(--red)'
                    }}>
                      {totalDiff >= 0 ? '▲ +' : '▼ '}{fmt(totalDiff)}
                    </span>
                  </div>
                </>;
              })()
            }
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title" style={{color:'var(--orange)'}}>Express</span>
            <span className={`badge ${Number(expressCardRatio) >= 80 ? 'badge-green' : 'badge-amber'}`}>
              {expressCardRatio ? `${expressCardRatio}% Active` : '—'}
            </span>
          </div>
          <div className="panel-body">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
              <div className="kpi-row"><span className="kpi-row-label">Charging Cards</span><span className="kpi-row-val">{fmt(expressData?.TotalChargingCards)}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Charging Points</span><span className="kpi-row-val">{fmt(expressData?.TotalChargingPoints)}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Active Cards</span><span className="kpi-row-val">{fmt(expressData?.TotalActiveCards)}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Active Points</span><span className="kpi-row-val">{fmt(expressData?.TotalActivePoints)}</span></div>
              <div className="kpi-row"><span className="kpi-row-label">Points Act. Ratio</span><span className={`kpi-row-val ${Number(expressPointRatio) >= 80 ? 'kpi-up' : 'kpi-dn'}`}>{expressPointRatio ? expressPointRatio + '%' : '—'}</span></div>
            </>}
          </div>
        </div>

      </div>
    </div>
  );
}
