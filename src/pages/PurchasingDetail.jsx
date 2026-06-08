import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

function fmt(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toFixed(2);
}

function pct(a, b) {
  if (!a || !b || Number(b) === 0) return '—';
  return ((Number(a) / Number(b)) * 100).toFixed(1) + '%';
}

function calcRatio(a, b) {
  if (!a || !b || Number(b) === 0) return null;
  return ((Number(a) / Number(b)) * 100).toFixed(1);
}

const card = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow)',
};

function BRow({ icon, label, amount, pctVal, color, bold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: bold ? 700 : 500 }}>
        {icon && <span>{icon}</span>}{label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: 'right' }}>{amount}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--orange)', minWidth: 44, textAlign: 'right' }}>{pctVal}</span>
      </div>
    </div>
  );
}

export default function PurchasingDetail({ user, lineData: initLineData, periodLabel: initPeriodLabel, onBack, controlData }) {
  const periodLabel = initPeriodLabel || '';
  const [data, setData] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vendorBalances, setVendorBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError(''); setData(null); setVendors([]); setVendorBalances([]);
    try {
      const d = await apiCall('Get Purchasing Details By Period', initLineData);
      setData(d.List0?.[0] || null);
      setVendors(d.List1 || []);
      setVendorBalances(d.List2 || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [period, months, quarters, year]);

  const monthLabel = MONTHS.find(m => m.value === month)?.label;
  const totalPurch = Number(data?.TotalPurchasingAmount || controlData?.TotalPurchasingAmount || 0);
  const totalPaid = Number(data?.TotalPaid || controlData?.TotalPaid || 0);
  const vendorBal = Number(data?.VendorBalance || controlData?.VendorBalance || 0);
  const importPurch = Number(data?.ImportPurchasing || 0);
  const localPurch = Number(data?.LocalPurchasing || 0);
  const rawPurch = Number(data?.RawPurchasing || 0);
  const otherPurch = Number(data?.OtherPurchasing || 0);
  const payRatio = calcRatio(totalPaid, totalPurch);
  const maxVendor = vendors.length ? Math.max(...vendors.map(v => Number(v.TotalAmount || 0))) : 1;
  const maxVendorBal = vendorBalances.length ? Math.max(...vendorBalances.map(v => Number(v.VendorBalance || 0))) : 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            <span style={{ color: 'var(--orange)', cursor: 'pointer' }} onClick={onBack}>Control Page</span>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>Purchasing</span>
          </div>
          <div className="page-title">Purchasing Details</div>
          <div className="page-sub">{periodLabel}</div>
        </div>
        <div className="page-actions">
          <select className="filter-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-primary" onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      {error && <div className="err-page">⚠ {error}</div>}

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Purchasing', value: fmt(totalPurch) },
          { label: 'Total Paid', value: fmt(totalPaid) },
          { label: 'Payment Ratio', value: payRatio ? payRatio + '%' : '—', color: payRatio ? (Number(payRatio) >= 80 ? 'var(--green)' : 'var(--red)') : 'inherit', sub: payRatio ? (Number(payRatio) >= 80 ? '▲ On track' : '▼ Below target') : '—', subColor: payRatio ? (Number(payRatio) >= 80 ? 'var(--green)' : 'var(--red)') : 'var(--muted)' },
          { label: 'Vendor Balance', value: fmt(vendorBal) },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ color: k.color || 'inherit' }}>{k.value}</div>
              <div className="kpi-change" style={{ color: k.subColor || 'var(--muted)' }}>{k.sub || `${monthLabel} ${year}`}</div>
            </>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Purchasing Breakdown</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{monthLabel} {year}</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <BRow icon="🏠" label="Local"  amount={fmt(localPurch)}  pctVal={pct(localPurch,  totalPurch)} color="var(--orange)" />
            <BRow icon="🌍" label="Import" amount={fmt(importPurch)} pctVal={pct(importPurch, totalPurch)} color="var(--blue)" />
            <BRow label="Total" amount={fmt(totalPurch)} pctVal="100%" bold color="var(--text)" />
          </>}
        </div>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Purchasing Type</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{monthLabel} {year}</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <BRow icon="🧪" label="Raw"   amount={fmt(rawPurch)}   pctVal={pct(rawPurch,   totalPurch)} color="var(--green)" />
            <BRow icon="📦" label="Other" amount={fmt(otherPurch)} pctVal={pct(otherPurch, totalPurch)} color="var(--amber)" />
            <BRow label="Total" amount={fmt(totalPurch)} pctVal="100%" bold color="var(--text)" />
          </>}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>

        <div className="table-panel" style={{marginBottom:0}}>
          <div className="panel-head">
            <span className="panel-title">Top 10 Vendors</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>{monthLabel} {year}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Vendor Name</th><th style={{textAlign:'right'}}>Total Amount</th><th style={{minWidth:140}}>Distribution</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} style={{textAlign:'center',padding:24}}><div className="spinner" style={{margin:'0 auto'}}></div></td></tr>
                  : vendors.length === 0 ? <tr><td colSpan={4} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>No data</td></tr>
                  : vendors.map((v, i) => (
                    <tr key={i}>
                      <td style={{color:'var(--muted)',fontWeight:600}}>{i+1}</td>
                      <td style={{fontWeight:500}}>{v.VendorName}</td>
                      <td style={{textAlign:'right',fontWeight:700}}>{fmt(v.TotalAmount)}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:6,background:'var(--border)',borderRadius:999,overflow:'hidden'}}>
                            <div style={{width:(Number(v.TotalAmount)/maxVendor*100)+'%',height:'100%',background:'var(--orange)',borderRadius:999}}></div>
                          </div>
                          <span style={{fontSize:11,color:'var(--muted)',minWidth:40,textAlign:'right'}}>{pct(v.TotalAmount,totalPurch)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-panel" style={{marginBottom:0}}>
          <div className="panel-head">
            <span className="panel-title">Top 10 Vendor Balances</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>{monthLabel} {year}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Vendor Name</th><th style={{textAlign:'right'}}>Balance</th><th style={{minWidth:140}}>Distribution</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} style={{textAlign:'center',padding:24}}><div className="spinner" style={{margin:'0 auto'}}></div></td></tr>
                  : vendorBalances.length === 0 ? <tr><td colSpan={4} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>No data</td></tr>
                  : vendorBalances.map((v, i) => (
                    <tr key={i}>
                      <td style={{color:'var(--muted)',fontWeight:600}}>{i+1}</td>
                      <td style={{fontWeight:500}}>{v.VendorName}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:'var(--red)'}}>{fmt(Math.abs(Number(v.VendorBalance)))}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:6,background:'var(--border)',borderRadius:999,overflow:'hidden'}}>
                            <div style={{width:(Math.abs(Number(v.VendorBalance))/maxVendorBal*100)+'%',height:'100%',background:'var(--orange)',borderRadius:999}}></div>
                          </div>
                          <span style={{fontSize:11,color:'var(--muted)',minWidth:40,textAlign:'right'}}>{pct(Math.abs(Number(v.VendorBalance)),vendorBal)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
