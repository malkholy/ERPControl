import { useState, useCallback } from 'react';
import { apiCall } from './shared/api.js';
import NAV from './nav.js';
import ControlPage from './pages/ControlPage.jsx';
import Expenses from './pages/Expenses.jsx';
import Projects from './pages/Projects.jsx';
import HR from './pages/HR.jsx';
import Cash from './pages/Cash.jsx';

// ─── Styles ──────────────────────────────────────────────────────────────────

const css = `
  :root {
    --bg: #f1f5f9;
    --surface: #ffffff;
    --soft: #f8fafc;
    --sidebar: #1a2332;
    --text: #0f172a;
    --muted: #64748b;
    --hint: #94a3b8;
    --border: #e2e8f0;
    --border2: #cbd5e1;
    --orange: #f97316;
    --orange2: #ea580c;
    --orange-glow: rgba(249,115,22,.18);
    --orange-soft: #fff7ed;
    --green: #16a34a;
    --green-soft: #f0fdf4;
    --red: #dc2626;
    --red-soft: #fef2f2;
    --amber: #d97706;
    --amber-soft: #fffbeb;
    --blue: #2563eb;
    --blue-soft: #eff6ff;
    --radius: 14px;
    --radius-sm: 10px;
    --radius-xs: 7px;
    --font: 'Plus Jakarta Sans', sans-serif;
    --mono: 'JetBrains Mono', monospace;
    --shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.05);
    --shadow-lg: 0 8px 28px rgba(0,0,0,.1);
  }
  .dark {
    --bg: #0d1117;
    --surface: #161b22;
    --soft: #1c2333;
    --text: #e6edf3;
    --muted: #8b949e;
    --hint: #484f58;
    --border: #30363d;
    --border2: #21262d;
    --orange: #fb923c;
    --orange2: #f97316;
    --orange-soft: rgba(251,146,60,.1);
    --green-soft: rgba(22,163,74,.12);
    --red-soft: rgba(220,38,38,.12);
    --amber-soft: rgba(217,119,6,.12);
    --blue-soft: rgba(37,99,235,.12);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.5; }

  /* ── LOGIN ── */
  .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 24px; }
  .login-card { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 36px; box-shadow: var(--shadow-lg); }
  .login-logo { width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; font-size: 20px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .login-title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .login-sub { color: var(--muted); font-size: 13px; margin-bottom: 28px; }
  .login-api { text-align: center; margin-top: 16px; font-size: 11px; color: var(--hint); font-family: var(--mono); }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 7px; letter-spacing: .08em; text-transform: uppercase; }
  .field input { width: 100%; height: 46px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); padding: 0 14px; background: var(--soft); color: var(--text); font-family: var(--font); font-size: 14px; outline: none; transition: border-color .2s; }
  .field input:focus { border-color: var(--orange); }
  .btn-login { width: 100%; height: 48px; border: none; border-radius: var(--radius-sm); background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; font-family: var(--font); font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 8px; transition: opacity .2s, transform .15s; }
  .btn-login:hover { opacity: .92; }
  .btn-login:active { transform: scale(.98); }
  .btn-login:disabled { opacity: .6; cursor: not-allowed; }
  .err-box { background: var(--red-soft); color: var(--red); border: 1px solid rgba(220,38,38,.2); border-radius: var(--radius-xs); padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }

  /* ── LAYOUT ── */
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: 256px; min-width: 256px; background: var(--sidebar); display: flex; flex-direction: column; position: fixed; inset: 0 auto 0 0; overflow: hidden; }
  .sb-head { padding: 18px 16px 12px; border-bottom: 1px solid rgba(255,255,255,.07); }
  .sb-brand { display: flex; align-items: center; gap: 11px; }
  .sb-logo { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; font-size: 15px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sb-name { font-size: 15px; font-weight: 800; color: #fff; }
  .sb-ver { font-size: 10px; color: rgba(255,255,255,.3); font-family: var(--mono); }
  .sb-nav { flex: 1; overflow-y: auto; padding: 10px 8px; }
  .sb-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: var(--radius-sm); cursor: pointer; color: rgba(255,255,255,.62); font-size: 13px; font-weight: 500; transition: all .15s; margin-bottom: 2px; border: none; background: none; width: 100%; text-align: left; font-family: var(--font); }
  .sb-item:hover { background: rgba(255,255,255,.07); color: #fff; }
  .sb-item.active { background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; font-weight: 700; box-shadow: 0 4px 14px var(--orange-glow); }
  .sb-icon { width: 28px; height: 28px; border-radius: 7px; background: rgba(255,255,255,.08); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .sb-item.active .sb-icon { background: rgba(255,255,255,.2); }
  .sb-foot { padding: 12px 8px; border-top: 1px solid rgba(255,255,255,.07); }
  .sb-profile { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 8px; }
  .sb-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sb-uname { font-size: 13px; font-weight: 700; color: #fff; }
  .sb-urole { font-size: 11px; color: rgba(255,255,255,.38); }
  .sb-actions { display: flex; gap: 6px; }
  .sb-btn { flex: 1; height: 34px; border: 1px solid rgba(255,255,255,.1); border-radius: var(--radius-xs); background: rgba(255,255,255,.05); color: rgba(255,255,255,.65); font-family: var(--font); font-size: 11px; font-weight: 600; cursor: pointer; transition: all .15s; }
  .sb-btn:hover { background: rgba(255,255,255,.12); color: #fff; }
  .sb-btn.danger { border-color: rgba(249,115,22,.22); background: rgba(249,115,22,.08); color: #fb923c; }
  .sb-btn.danger:hover { background: rgba(249,115,22,.18); color: #fff; }

  /* ── MAIN ── */
  .main { margin-left: 256px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); }
  .topbar { height: 50px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: flex-end; padding: 0 22px; position: sticky; top: 0; z-index: 10; overflow-x: auto; }
  .tabs { display: flex; gap: 3px; align-items: flex-end; height: 100%; }
  .tab-item { height: 36px; display: flex; align-items: center; gap: 7px; padding: 0 12px; border: 1px solid var(--border); border-bottom: none; border-radius: 9px 9px 0 0; background: var(--soft); color: var(--muted); font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; position: relative; transition: all .15s; font-family: var(--font); }
  .tab-item:hover { background: var(--surface); color: var(--text); }
  .tab-item.active { background: var(--surface); color: var(--text); }
  .tab-item.active::after { content: ''; position: absolute; top: 0; left: 12px; right: 12px; height: 2.5px; background: linear-gradient(90deg, var(--orange), var(--orange2)); border-radius: 999px; }
  .tab-close { font-size: 10px; color: var(--hint); margin-left: 2px; padding: 2px 4px; border-radius: 3px; border: none; background: none; cursor: pointer; font-family: var(--font); }
  .tab-close:hover { background: var(--border); color: var(--muted); }
  .page-area { flex: 1; padding: 24px; }

  /* ── SHARED PAGE ── */
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
  .page-title { font-size: 20px; font-weight: 800; }
  .page-sub { font-size: 13px; color: var(--muted); margin-top: 3px; }
  .page-actions { display: flex; gap: 8px; align-items: center; }
  .btn-primary { height: 36px; padding: 0 16px; border: none; border-radius: var(--radius-xs); background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity .15s; }
  .btn-primary:hover { opacity: .9; }
  .btn-secondary { height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: var(--radius-xs); background: var(--surface); color: var(--text); font-family: var(--font); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
  .btn-secondary:hover { border-color: var(--border2); background: var(--soft); }
  .loading-wrap { text-align: center; padding: 48px; color: var(--muted); }
  .spinner { display: inline-block; width: 22px; height: 22px; border: 2.5px solid var(--border); border-top-color: var(--orange); border-radius: 50%; animation: spin .7s linear infinite; margin-bottom: 10px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .err-page { background: var(--red-soft); color: var(--red); border: 1px solid rgba(220,38,38,.2); border-radius: var(--radius-xs); padding: 12px 16px; font-size: 13px; margin-bottom: 16px; }
`;

// ─── Inject styles ────────────────────────────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ─── Page map ─────────────────────────────────────────────────────────────────
const PAGE_COMPONENTS = {
  control: ControlPage,
  expenses: Expenses,
  projects: Projects,
  hr: HR,
  cash: Cash,
};

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(false);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);

  // login
  const [un, setUn] = useState('');
  const [pw, setPw] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const toggleDark = () => {
    setDark(d => {
      document.body.classList.toggle('dark', !d);
      return !d;
    });
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!un || !pw) { setLoginErr('Enter username and password'); return; }
    setLoginLoading(true); setLoginErr('');
    try {
      const lineData = JSON.stringify({ Username: un, Password: pw });
      const d = await apiCall('Login', { LineData: lineData });
      if (d.State === 0 && d.List0?.length) {
        const u = d.List0[0];
        setUser({ Username: u.Username || un, Name: u.Name || un });
        openPage('control');
      } else {
        setLoginErr(d.Message || 'Invalid username or password');
      }
    } catch (e) {
      setLoginErr('Connection error: ' + e.message);
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    setUser(null); setOpenTabs([]); setActiveTab(null);
  };

  const openPage = useCallback((id) => {
    setActiveTab(id);
    setOpenTabs(prev => prev.find(t => t.id === id) ? prev : [...prev, { id, ...NAV.find(n => n.id === id) }]);
  }, []);

  const closeTab = (id, e) => {
    e.stopPropagation();
    setOpenTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTab === id) setActiveTab(next.length ? next[next.length - 1].id : null);
      return next;
    });
  };

  const ActivePage = activeTab ? PAGE_COMPONENTS[activeTab] : null;
  const activeDef = NAV.find(n => n.id === activeTab);

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">EC</div>
          <div className="login-title">ERP Control</div>
          <div className="login-sub">GLC Paints Control Panel</div>
          {loginErr && <div className="err-box">{loginErr}</div>}
          <div className="field">
            <label>Username</label>
            <input value={un} onChange={e => setUn(e.target.value)} placeholder="Enter username" autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Enter password" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <button className="btn-login" onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? 'Signing in…' : 'Sign In'}
          </button>
          <div className="login-api">quick.glcpaints.com:7003</div>
        </div>
      </div>
    );
  }

  const initials = (user.Name || user.Username).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`app${dark ? ' dark' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sb-head">
          <div className="sb-brand">
            <div className="sb-logo">EC</div>
            <div>
              <div className="sb-name">ERP Control</div>
              <div className="sb-ver">GLC Paints · v1.0</div>
            </div>
          </div>
        </div>
        <nav className="sb-nav">
          {NAV.map(n => (
            <button key={n.id} className={`sb-item${activeTab === n.id ? ' active' : ''}`} onClick={() => openPage(n.id)}>
              <span className="sb-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sb-foot">
          <div className="sb-profile">
            <div className="sb-avatar">{initials}</div>
            <div>
              <div className="sb-uname">{user.Name || user.Username}</div>
              <div className="sb-urole">System User</div>
            </div>
          </div>
          <div className="sb-actions">
            <button className="sb-btn" onClick={toggleDark}>{dark ? '☀️' : '🌙'} Theme</button>
            <button className="sb-btn danger" onClick={handleLogout}>↩ Logout</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <section className="main">
        <header className="topbar">
          <div className="tabs">
            {openTabs.map(t => (
              <div key={t.id} className={`tab-item${t.id === activeTab ? ' active' : ''}`} onClick={() => openPage(t.id)}>
                <span>{t.icon}</span> {t.label}
                <button className="tab-close" onClick={e => closeTab(t.id, e)}>✕</button>
              </div>
            ))}
          </div>
        </header>
        <div className="page-area">
          {ActivePage
            ? <ActivePage user={user} def={activeDef} />
            : <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Select a page from the sidebar</div>
          }
        </div>
      </section>
    </div>
  );
}
