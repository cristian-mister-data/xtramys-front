import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { getAdminUserActivity } from '@/api/auth';

const Page = styled.main`
  max-width: 1100px; margin: auto; padding: 24px; width: 100%; box-sizing: border-box;
  h1 { font-size: 26px; } p { line-height: 1.6; } a { color: inherit; }
  nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0; }
  button { color: inherit; background: ${({ theme }) => theme.colors.surface}; border: 1px solid ${({ theme }) => theme.colors.border}; padding: 10px 14px; border-radius: 8px; cursor: pointer; font: inherit; }
  button[aria-pressed=true] { border-color: #ff6b35; color: #ff6b35; }
  button:disabled { opacity: .5; cursor: default; }
  details { border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 10px; margin: 12px 0; padding: 16px; }
  summary { cursor: pointer; font-weight: 700; }
  dl { margin: 12px 0; } dt { font-weight: 600; margin-top: 12px; } dd { margin: 4px 0 0 12px; overflow-wrap: anywhere; white-space: pre-wrap; }
`;
const statuses = { not_started: 'Sin activar', awaiting_activation: 'Pendiente de confirmar el correo', active: 'Prueba activa', expired: 'Prueba caducada', unavailable: 'Prueba no disponible' };
const labels = { nombre: 'Nombre', apellido: 'Apellido', createdAt: 'Creado', updatedAt: 'Última modificación', fecha: 'Fecha', descripcion: 'Descripción', name: 'Nombre', title: 'Título', content: 'Contenido', trialActivationRequestedAt: 'Enlace solicitado', trialActivationEmailSentAt: 'Correo enviado', trialStartedAt: 'Prueba activada', trialEndsAt: 'Fin de la prueba', trialActivatedBy: 'Usuario que activó', trialActivationSource: 'Origen de la solicitud' };
function Value({ value }) {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.length ? <ol>{value.map((item, index) => <li key={index}><Value value={item} /></li>)}</ol> : 'Sin elementos';
  if (typeof value === 'object') return <Fields value={value} />;
  if (typeof value === 'string' && /^https?:\/\//.test(value)) return <a href={value} target="_blank" rel="noreferrer">Abrir archivo o enlace</a>;
  if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)) return new Date(value).toLocaleString('es-ES');
  return String(value);
}
function Fields({ value }) {
  return <dl>{Object.entries(value).filter(([key]) => !['_id', '__v'].includes(key)).map(([key, item]) =>
    <div key={key}><dt>{labels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2')}</dt><dd><Value value={item} /></dd></div>)}</dl>;
}
export default function AdminUserActivity() {
  const actor = useSelector((s) => s.usuario.user);
  const { userId } = useParams();
  const [overview, setOverview] = useState(null);
  const [section, setSection] = useState('');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (actor?.role !== 'admin') return;
    let alive = true;
    setOverview(null); setError(''); setSection(''); setPage(1);
    getAdminUserActivity(userId).then(data => { if (alive) setOverview(data); })
      .catch(err => { if (alive) setError(err.message || 'No se pudo cargar la actividad.'); });
    return () => { alive = false; };
  }, [userId, actor?.role, revision]);
  useEffect(() => {
    setRecords(null);
    if (!section || actor?.role !== 'admin') return;
    let alive = true;
    setError('');
    getAdminUserActivity(userId, section, page).then(data => { if (alive) setRecords(data); })
      .catch(err => { if (alive) setError(err.message || 'No se pudo cargar esta sección.'); });
    return () => { alive = false; };
  }, [userId, section, page, actor?.role]);
  if (actor?.role !== 'admin') return <Navigate to="/profile" replace />;
  const account = overview?.account;
  return <Page>
    <Link to="/profile">← Volver a administración</Link>
    <h1>Actividad guardada</h1>
    <p>Consulta de solo lectura. Los datos siguen disponibles para admin después de caducar la prueba.</p>
    {error && <p role="alert">{error} <button onClick={() => setRevision(value => value + 1)}>Reintentar</button></p>}
    {!overview && !error && <p role="status">Cargando actividad…</p>}
    {account && <>
      <h2>{`${account.nombre || ''} ${account.apellido || ''}`.trim() || account.correo}</h2>
      <p>{account.correo} · {statuses[account.trialStatus]} · {account.subscriptionStatus || account.plan}</p>
      <Fields value={Object.fromEntries(['trialActivationRequestedAt', 'trialActivationEmailSentAt', 'trialStartedAt', 'trialEndsAt', 'trialActivatedBy', 'trialActivationSource'].map(key => [key, account[key]]))} />
      <nav aria-label="Secciones de actividad">{overview.sections.map(item => <button key={item.key} aria-pressed={section === item.key} onClick={() => { setSection(item.key); setPage(1); }}>{item.label} ({item.count})</button>)}</nav>
      {!section && <p>Selecciona una sección para ver los registros guardados.</p>}
      {section && !records && !error && <p role="status">Cargando registros…</p>}
      {records && <section>
        <h2>{records.label} · {records.total} registros</h2>
        {!records.items.length && <p>No hay registros en esta página.</p>}
        {records.items.map((item, index) => <details key={item._id || index}><summary>{item.nombre || item.name || item.titulo || item.title || `${records.label} ${(page - 1) * records.limit + index + 1}`}</summary><Fields value={item} /></details>)}
        <nav aria-label="Páginas"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(records.total / records.limit))}</span><button disabled={page * records.limit >= records.total} onClick={() => setPage(value => value + 1)}>Siguiente</button></nav>
      </section>}
    </>}
  </Page>;
}
