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

function growth(a, b) {
  if (!a || !b || Number(a) === 0) return null;
  return ((Number(b) - Number(a)) / Number(a)) * 100;
}

function GrowthBadge({ prev, curr }) {
  const g = growth(prev, curr);
  if (g === null) return <span style={{color:'var(--muted)'}}>—</span>;
  const up = g >= 0;
  return <span style={{color: up?'var(--green)':'var(--red)', fontWeight:600, fontSize:13}}>{up?'▲':'▼'} {up?'+':''}{g.toFixed(1)}%</span>;
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
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={() => setOpen(o => !o)} style={{
        height:30, padding:'0 10px', fontSize:12, border:'0.5px solid var(--border)',
        borderRadius:'var(--radius-xs)', background:'var(--surface)', color:'var(--text)',
        cursor:'pointer', display:'flex', alignItems:'center', gap:6, minWidth:120, fontFamily:'var(--font)'
      }}>
        <span style={{flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{label}</span>
        {selected.length > 1 && <span style={{background:'var(--orange)', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:999}}>{selected.length}</span>}
        <span style={{fontSize:10}}>▾</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:34, right:0, background:'var(--surface)',
          border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
          zIndex:100, minWidth:160, boxShadow:'var(--shadow-lg)', maxHeight:240, overflowY:'auto'
        }}>
          {options.map(o => (
            <div key={o.value} onClick={() => {
              const next = selected.includes(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value];
              onChange(next.length ? next : [o.value]);
            }} style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 12px', fontSize:12,
              cursor:'pointer', color: selected.includes(o.value)?'var(--orange)':'var(--text)',
              fontWeight: selected.includes(o.value)?600:400,
              background: selected.includes(o.value)?'var(--orange-soft)':'transparent'
            }}>
              <input type="checkbox" checked={selected.includes(o.value)} readOnly style={{accentColor:'var(--orange)', width:13, height:13}} />
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getPeriodLabel(period, months, quarters, year) {
  if (period === 'yearly') return `Year ${year}`;
  if (period === 'quarterly') {
    const s = [...quarters].sort((a,b)=>a-b);
    return s.length===1 ? `Q${s[0]} ${year}` : s.map(q=>`Q${q}`).join(', ')+` ${year}`;
  }
  const s = [...months].sort((a,b)=>a-b);
  return s.length===1 ? `${MONTHS.find(m=>m.value===s[0])?.label} ${year}` : s.map(m=>MONTHS.find(x=>x.value===m)?.label?.slice(0,3)).join(', ')+` ${year}`;
}

function buildLineData(period, months, quarters, year) {
  if (period === 'yearly') return { Period:'yearly', Months:'', Quarter:0, Year:year };
  if (period === 'quarterly') {
    const s = [...quarters].sort((a,b)=>a-b);
    const qm = s.flatMap(q => q===1?[1,2,3]:q===2?[4,5,6]:q===3?[7,8,9]:[10,11,12]);
    return { Period:'quarterly', Months:[...new Set(qm)].join(','), Quarter:s[0], Year:year };
  }
  return { Period:'monthly', Months:[...months].sort((a,b)=>a-b).join(','), Quarter:0, Year:year };
}

const card = {
  background:'var(--surface)', border:'1px solid var(--border)',
  borderRadius:'var(--radius)', padding:'20px 24px', boxShadow:'var(--shadow)',
};

function BRow({ icon, label, amount, pctVal, color, bold }) {
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)'}}>
      <div style={{display:'flex', alignItems:'center', gap:10, fontSize:14, fontWeight:bold?700:500}}>
        {icon && <span>{icon}</span>}{label}
      </div>
      <div style={{display:'flex', alignItems:'center', gap:16}}>
        <span style={{fontSize:14, fontWeight:700, minWidth:60, textAlign:'right'}}>{amount}</span>
        <span style={{fontSize:13, fontWeight:600, color:color||'var(--orange)', minWidth:44, textAlign:'right'}}>{pctVal}</span>
      </div>
    </div>
  );
}

export default function SalesDetail({ user, lineData: initLineData, periodLabel: initPeriodLabel, onBack, controlData }) {
  const now = new Date();
  const init = initLineData || {};
  const [period, setPeriod] = useState(init.Period || 'monthly');
  const [months, setMonths] = useState(init.Months ? init.Months.split(',').map(Number) : [now.getMonth()+1]);
  const [quarters, setQuarters] = useState([init.Quarter || Math.ceil((now.getMonth()+1)/3)]);
  const [year, setYear] = useState(init.Year || now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const periodLabel = getPeriodLabel(period, months, quarters, year);
  const lineData = buildLineData(period, months, quarters, year);

  async function load() {
    setLoading(true); setError(''); setData(null);
    try {
      const d = await apiCall('Get Sales Details By Period', lineData);
      setData(d.List0?.[0] || null);
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [period, months, quarters, year]);

  const totalSales      = Number(data?.TotalSalesAmount || controlData?.TotalSalesAmount || 0);
  const totalCollection = Number(data?.TotalCollection  || controlData?.TotalCollection  || 0);
  const customerBalance = Number(data?.CustomerBalance  || controlData?.CustomerBalance  || 0);
  const exportSales     = Number(data?.ExportSales      || 0);
  const localSales      = totalSales - exportSales;
  const collRatio       = totalSales ? ((totalCollection/totalSales)*100).toFixed(1) : null;
  const localTotal      = Number(data?.WhiteSales||0)+Number(data?.ColorCenterSales||0)+Number(data?.ProjectSales||0);
  const ytdLocal2025    = Number(data?.SalesAmount2025||0)-Number(data?.YTD2025Export||0);
  const ytdLocal2026    = Number(data?.SalesAmount2026||0)-Number(data?.YTD2026Export||0);
  const ytdTotal2025    = Number(data?.SalesAmount2025||0);
  const ytdTotal2026    = Number(data?.SalesAmount2026||0);

  return (
    <div>
      {/* Header Card */}
      <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px', marginBottom:16}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontSize:12, color:'var(--muted)', marginBottom:4}}>
              <span style={{color:'var(--orange)', cursor:'pointer'}} onClick={onBack}>Control Page</span>
              <span style={{margin:'0 6px'}}>›</span><span>Sales</span>
            </div>
            <div className="page-title">Sales Details</div>
          </div>
          <button className="btn-primary" onClick={load} style={{height:32, fontSize:12}}>🔄 Refresh</button>
        </div>
        <div style={{height:'0.5px', background:'var(--border)', margin:'12px 0'}}></div>
        <div style={{display:'flex', alignItems:'center', gap:8}} onClick={e => e.stopPropagation()}>
          <div style={{display:'flex', border:'0.5px solid var(--border2)', borderRadius:'var(--radius-xs)', overflow:'hidden'}}>
            {['monthly','quarterly','yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding:'5px 14px', fontSize:12, border:'none', cursor:'pointer', fontFamily:'var(--font)',
                background: period===p?'var(--orange)':'var(--surface)',
                color: period===p?'#fff':'var(--muted)', fontWeight: period===p?600:400,
                textTransform:'capitalize'
              }}>{p}</button>
            ))}
          </div>
          {period === 'monthly' && <MultiSelect options={MONTHS} selected={months} onChange={setMonths} placeholder="Select months" />}
          {period === 'quarterly' && <MultiSelect options={QUARTERS} selected={quarters} onChange={setQuarters} placeholder="Select quarters" />}
          <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{height:30, fontSize:12}}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{marginTop:10, display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'var(--muted)', background:'var(--soft)', padding:'3px 10px', borderRadius:999}}>
          📅 {periodLabel}
        </div>
      </div>

      {error && <div className="err-page">⚠ {error}</div>}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)', marginBottom:24}}>
        {[
          { label:'Total Sales',      value:fmt(totalSales),      color:null },
          { label:'Total Collection', value:fmt(totalCollection), color:null },
          { label:'Collection Ratio', value:collRatio?collRatio+'%':'—',
            color:collRatio?(Number(collRatio)>=80?'var(--green)':'var(--red)'):null,
            sub:collRatio?(Number(collRatio)>=80?'▲ On track':'▼ Below target'):'—' },
          { label:'Customer Balance', value:fmt(customerBalance), color:null },
        ].map((k,i) => (
          <div key={i} className="kpi-card">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{color:k.color||'inherit'}}>{k.value}</div>
              <div className="kpi-change" style={{color:k.color||'var(--muted)'}}>{k.sub||periodLabel}</div>
            </>}
          </div>
        ))}
      </div>

      {/* 3 panels */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16}}>
        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <span style={{fontSize:15, fontWeight:700}}>Sales Breakdown</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>{periodLabel}</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <BRow icon="🏠" label="Local"  amount={fmt(localSales)}  pctVal={pct(localSales,totalSales)}  color="var(--orange)" />
            <BRow icon="🌍" label="Export" amount={fmt(exportSales)} pctVal={pct(exportSales,totalSales)} color="var(--blue)" />
            <BRow label="Total" amount={fmt(totalSales)} pctVal="100%" bold color="var(--text)" />
          </>}
        </div>

        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <span style={{fontSize:15, fontWeight:700}}>Customer Breakdown</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>Local Sales</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <BRow icon="👥" label="White Customers" amount={fmt(data?.WhiteSales)}       pctVal={pct(data?.WhiteSales,localTotal)}       color="var(--green)" />
            <BRow icon="🎨" label="Color Centers"   amount={fmt(data?.ColorCenterSales)} pctVal={pct(data?.ColorCenterSales,localTotal)} color="var(--amber)" />
            <BRow icon="🏗️" label="Projects"        amount={fmt(data?.ProjectSales)}     pctVal={pct(data?.ProjectSales,localTotal)}     color="#7c3aed" />
            <BRow label="Total Local" amount={fmt(localTotal)} pctVal="100%" bold color="var(--text)" />
          </>}
        </div>

        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <span style={{fontSize:15, fontWeight:700}}>YTD {year-1} vs {year}</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>Year to date</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div style={{display:'grid', gridTemplateColumns:'1fr 80px 80px 72px', gap:6, padding:'6px 0', borderBottom:'1px solid var(--border)'}}>
              {['Type',String(year-1),String(year),'Growth'].map((h,i)=>(
                <span key={i} style={{fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', textAlign:i>0?'right':'left'}}>{h}</span>
              ))}
            </div>
            {[
              {icon:'🏠', label:'Local',  p:ytdLocal2025, c:ytdLocal2026},
              {icon:'🌍', label:'Export', p:data?.YTD2025Export, c:data?.YTD2026Export},
              {icon:'📊', label:'Total',  p:ytdTotal2025, c:ytdTotal2026, bold:true},
            ].map((r,i) => (
              <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 80px 80px 72px', gap:6, padding:'10px 0', borderBottom:i<2?'1px solid var(--border)':'none', alignItems:'center'}}>
                <span style={{fontSize:13, fontWeight:r.bold?700:500}}>{r.icon} {r.label}</span>
                <span style={{fontSize:13, textAlign:'right', color:'var(--muted)', fontWeight:r.bold?700:400}}>{fmt(r.p)}</span>
                <span style={{fontSize:13, textAlign:'right', fontWeight:700}}>{fmt(r.c)}</span>
                <span style={{textAlign:'right'}}><GrowthBadge prev={r.p} curr={r.c} /></span>
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}
