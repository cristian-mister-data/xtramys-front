import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/config';

const money = new Intl.NumberFormat('es-ES');
const savedKey = () => localStorage.getItem('xtramys:ops:key') || '';
const isoDay = (date) => date.toISOString().slice(0, 10);
const monthOf = (date = '') => String(date).slice(0, 7) || 'Sin fecha';
const normalizeReports = (items = []) => {
  if (!Array.isArray(items)) return [];
  if (items.some((item) => Array.isArray(item?.reports))) {
    return items.map((item) => ({ month: item.month || 'Sin fecha', reports: item.reports || [] }));
  }
  return items.reduce((months, report) => {
    const month = monthOf(report.date);
    let group = months.find((x) => x.month === month);
    if (!group) {
      group = { month, reports: [] };
      months.push(group);
    }
    group.reports.push(report);
    return months;
  }, []);
};

function fmtBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Card({ title, value, sub }) {
  return (
    <div className="ops-card">
      <span>{title}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

const userLabel = (item = {}) => item.userEmail || item.correo || item.userId || item.key || 'anon';

export default function OpsDashboard() {
  const [key, setKey] = useState(savedKey);
  const [inputKey, setInputKey] = useState(savedKey);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sort, setSort] = useState(['requests', 'desc']);
  const [lastErrorAt, setLastErrorAt] = useState('');
  const [reports, setReports] = useState([]);
  const [from, setFrom] = useState(isoDay(new Date()));
  const [to, setTo] = useState(isoDay(new Date()));

  useEffect(() => {
    if (!key) return;
    localStorage.setItem('xtramys:ops:key', key);
    let alive = true;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/ops/summary`, { headers: { 'x-ops-key': key } });
        if (!res.ok) throw new Error(res.status === 401 ? 'Clave incorrecta' : `HTTP ${res.status}`);
        const json = await res.json();
        const reportsRes = await fetch(`${API_URL}/ops/reports`, { headers: { 'x-ops-key': key } });
        const reportsJson = reportsRes.ok ? await reportsRes.json() : [];
        if (!alive) return;
        setData(json);
        setReports(normalizeReports(reportsJson));
        setError('');
        const newest = json.errors?.find((e) => e.status >= 500)?.at;
        if (newest && lastErrorAt && newest !== lastErrorAt && Notification.permission === 'granted') {
          new Notification('Xtramys error 500', { body: json.errors[0]?.path || 'Nuevo error en backend' });
        }
        if (newest) setLastErrorAt(newest);
      } catch (e) {
        if (alive) setError(e.message);
      }
    }

    load();
    const timer = setInterval(load, 120000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [key, lastErrorAt]);

  const routes = useMemo(() => {
    const [field, dir] = sort;
    return [...(data?.routes || [])].sort((a, b) => {
      const av = a[field] ?? 0;
      const bv = b[field] ?? 0;
      return dir === 'asc' ? av - bv : bv - av;
    });
  }, [data, sort]);

  function login(e) {
    e.preventDefault();
    setKey(inputKey.trim());
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }

  async function openReport(date) {
    const res = await fetch(`${API_URL}/ops/reports/${date}.md`, { headers: { 'x-ops-key': key } });
    if (!res.ok) return setError(`No se pudo abrir el informe ${date}`);
    const blob = new Blob([await res.text()], { type: 'text/markdown' });
    window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
  }

  function openMd(text) {
    const blob = new Blob([text], { type: 'text/markdown' });
    window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
  }

  async function generateReportNow() {
    const res = await fetch(`${API_URL}/ops/reports/generate-now`, { method: 'POST', headers: { 'x-ops-key': key } });
    if (!res.ok) return setError('No se pudo generar el informe');
    const report = await res.json();
    openMd(report.reportMd || '');
  }

  async function generateRange() {
    const res = await fetch(`${API_URL}/ops/reports/generate-range`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ops-key': key },
      body: JSON.stringify({ from, to }),
    });
    if (!res.ok) return setError('No se pudo generar el informe de la franja');
    const report = await res.json();
    openMd(report.reportMd || '');
  }

  async function deleteDaily(date) {
    if (!confirm(`Eliminar informe ${date}?`)) return;
    const res = await fetch(`${API_URL}/ops/reports/${date}`, { method: 'DELETE', headers: { 'x-ops-key': key } });
    if (!res.ok) return setError(`No se pudo eliminar ${date}`);
    setReports((months) => months
      .map((m) => ({ ...m, reports: (m.reports || []).filter((r) => r.date !== date) }))
      .filter((m) => m.reports.length));
  }

  function preset(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    setFrom(isoDay(start));
    setTo(isoDay(end));
  }

  if (!key) {
    return (
      <main className="ops-page">
        <style>{css}</style>
        <form className="ops-login" onSubmit={login}>
          <h1>Ops Xtramys</h1>
          <p>Panel externo gratuito. Entra con la clave `OPS_DASHBOARD_KEY`.</p>
          <input type="password" value={inputKey} onChange={(e) => setInputKey(e.target.value)} placeholder="Clave ops" />
          <button>Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="ops-page">
      <style>{css}</style>
      <header className="ops-header">
        <div>
          <h1>Ops Xtramys</h1>
          <p>Auto-refresh cada 2 minutos. Uptime: {data ? `${data.uptimeSeconds}s` : '...'}</p>
        </div>
        <button onClick={() => { localStorage.removeItem('xtramys:ops:key'); setKey(''); }}>Cambiar clave</button>
      </header>

      {error ? <div className="ops-error">{error}</div> : null}
      {!data ? <div className="ops-card">Cargando...</div> : (
        <>
          <section className="ops-grid">
            <Card title="Peticiones" value={money.format(data.totalRequests)} sub="totales desde arranque" />
            <Card title="Errores" value={money.format(data.totalErrors)} sub={`${data.errorRate}% error rate`} />
            <Card title="Usuarios activos" value={data.activeUsers.length} sub="ultimos 5 minutos" />
            <Card title="Memoria" value={fmtBytes(data.memory?.rss)} sub="RSS proceso Node" />
          </section>

          <section className="ops-section">
            <h2>Peticiones por ruta</h2>
            <div className="ops-actions">
              {['requests', 'errors', 'avgMs'].map((field) => (
                <button key={field} onClick={() => setSort([field, sort[0] === field && sort[1] === 'desc' ? 'asc' : 'desc'])}>
                  Ordenar por {field}
                </button>
              ))}
            </div>
            <table>
              <thead><tr><th>Ruta</th><th>Usuarios</th><th>Peticiones</th><th>Errores</th><th>Avg ms</th><th>Ultima</th></tr></thead>
              <tbody>{routes.map((r) => (
                <tr key={r.key}>
                  <td>{r.key}</td>
                  <td>{(r.users || []).slice(0, 4).map((u) => `${userLabel(u)} (${u.requests})`).join(', ')}</td>
                  <td>{r.requests}</td>
                  <td>{r.errors}</td>
                  <td>{r.avgMs}</td>
                  <td>{r.lastAt}</td>
                </tr>
              ))}</tbody>
            </table>
          </section>

          <section className="ops-split">
            <div className="ops-section">
              <h2>Usuarios conectados</h2>
              <table>
                <thead><tr><th>Usuario</th><th>Ultima ruta</th><th>Ultimo ping</th></tr></thead>
                <tbody>{data.activeUsers.map((u) => (
                  <tr key={u.userId}><td>{userLabel(u)}</td><td>{u.lastPath}</td><td>{u.lastAt}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div className="ops-section">
              <h2>Top usuarios</h2>
              <table>
                <thead><tr><th>Usuario</th><th>Peticiones</th><th>Errores</th></tr></thead>
                <tbody>{data.users.slice(0, 20).map((u) => (
                  <tr key={u.key}><td>{userLabel(u)}</td><td>{u.requests}</td><td>{u.errors}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <section className="ops-section">
            <h2>Queries por usuario</h2>
            <table>
              <thead><tr><th>Usuario</th><th>Queries</th></tr></thead>
              <tbody>{data.users.slice(0, 30).map((u) => (
                <tr key={`queries-${u.key}`}>
                  <td>{userLabel(u)}</td>
                  <td>{(u.routes || []).slice(0, 10).map((r) => `${r.route} (${r.requests})`).join(', ')}</td>
                </tr>
              ))}</tbody>
            </table>
          </section>

          <section className="ops-section">
            <h2>Informes diarios</h2>
            <div className="ops-actions">
              <button onClick={generateReportNow}>Generar hoy ahora</button>
              <button onClick={() => preset(1)}>Hoy</button>
              <button onClick={() => preset(30)}>Mes</button>
              <button onClick={() => preset(183)}>6 meses</button>
              <button onClick={() => preset(365)}>Año</button>
              <button onClick={() => { setFrom('2000-01-01'); setTo(isoDay(new Date())); }}>Todo histórico</button>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <button onClick={generateRange}>Generar franja</button>
            </div>
            {reports.map((month) => (
              <details key={month.month} open className="ops-month">
                <summary>{month.month} ({(month.reports || []).length})</summary>
                <table>
                  <thead><tr><th>Dia</th><th>Peticiones</th><th>Errores</th><th>Generado</th><th></th></tr></thead>
                  <tbody>{(month.reports || []).map((r) => (
                    <tr key={r.date}>
                      <td>{r.date}</td>
                      <td>{r.totalRequests}</td>
                      <td>{r.totalErrors}</td>
                      <td>{r.generatedAt || r.updatedAt}</td>
                      <td><button onClick={() => openReport(r.date)}>Ver .md</button> <button onClick={() => deleteDaily(r.date)}>Eliminar</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </details>
            ))}
          </section>

          <section className="ops-section">
            <h2>Ultimos errores</h2>
            <table>
              <thead><tr><th>Fecha</th><th>Status</th><th>Usuario</th><th>Ruta</th><th>ms</th><th>IP</th></tr></thead>
              <tbody>{data.errors.map((e, i) => (
                <tr key={`${e.at}-${i}`}><td>{e.at}</td><td>{e.status}</td><td>{userLabel(e)}</td><td>{e.method} {e.path}</td><td>{e.durationMs}</td><td>{e.ip}</td></tr>
              ))}</tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}

const css = `
  body { margin: 0; background: #101418; color: #e8f0f2; }
  .ops-page { min-height: 100vh; padding: 32px; font-family: ui-sans-serif, system-ui, sans-serif; background: radial-gradient(circle at top left, #1f3b35, transparent 35%), #101418; }
  .ops-login { max-width: 420px; margin: 14vh auto; padding: 28px; background: #172024; border: 1px solid #2b3b40; border-radius: 24px; box-shadow: 0 20px 80px #0008; }
  .ops-login input { width: 100%; box-sizing: border-box; margin: 18px 0 12px; padding: 14px; border-radius: 12px; border: 1px solid #385158; background: #0f1518; color: white; }
  button { border: 0; border-radius: 999px; padding: 10px 16px; background: #bef264; color: #142000; font-weight: 800; cursor: pointer; }
  h1, h2, p { margin-top: 0; }
  .ops-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
  .ops-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px; }
  .ops-card, .ops-section, .ops-error { background: #172024dd; border: 1px solid #2b3b40; border-radius: 20px; padding: 18px; box-shadow: 0 12px 40px #0004; }
  .ops-card span, .ops-card small { display: block; color: #9fb0b5; }
  .ops-card strong { display: block; font-size: 34px; margin: 8px 0; }
  .ops-section { margin-top: 18px; overflow: auto; }
  .ops-split { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .ops-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .ops-actions input { border: 1px solid #385158; border-radius: 999px; background: #0f1518; color: white; padding: 10px 12px; }
  .ops-month { margin-top: 12px; }
  .ops-month summary { cursor: pointer; color: #bef264; font-weight: 800; margin-bottom: 8px; }
  .ops-error { margin-bottom: 16px; color: #fecaca; border-color: #7f1d1d; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 10px; border-bottom: 1px solid #29383d; text-align: left; white-space: nowrap; }
  td:first-child { white-space: normal; }
  th { color: #bef264; }
  @media (max-width: 900px) { .ops-page { padding: 16px; } .ops-grid, .ops-split { grid-template-columns: 1fr; } .ops-header { display: block; } }
`;
