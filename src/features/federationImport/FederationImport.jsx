import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import Modal from '@/ui/Modal';
import { Button, Row, Stack, Muted } from '@/ui/primitives';
import { api } from '@/api/client';
import { createRival, updateRival, fetchRivalsByTeam } from '@/store/slices/rival/rivalThunks';
import { createMatchSheet, fetchMatchSheetsByTeam } from '@/store/slices/matchSheet/matchSheetThunks';
import { matchesForTeam, teamKey } from './parseFederationPdf';

const Form = styled.div`
  display: grid; gap: 18px;
  label { display: grid; gap: 7px; font-weight: 600; }
  input, select { padding: 10px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 9px; background: ${({ theme }) => theme.colors.surface}; color: inherit; width: 100%; box-sizing: border-box; }
  input:focus-visible, select:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary}; }
`;
const Preview = styled.div`
  overflow: auto; max-height: 310px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px;
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; padding: 10px; border-bottom: 1px solid ${({ theme }) => theme.colors.border}; }
  th { position: sticky; top: 0; background: ${({ theme }) => theme.colors.surface}; }
  img { width: 36px; height: 36px; object-fit: contain; }
`;
const Notice = styled.div`
  padding: 12px; border-radius: 10px; background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border}; font-size: 13px; line-height: 1.5;
`;

export default function FederationImport({ team, onImported }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [directoryFile, setDirectoryFile] = useState(null), [calendarFile, setCalendarFile] = useState(null);
  const [directory, setDirectory] = useState([]), [calendar, setCalendar] = useState([]);
  const [ownName, setOwnName] = useState(''), [tournamentId, setTournamentId] = useState('');
  const [tournaments, setTournaments] = useState([]), [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState(''), [progress, setProgress] = useState(''), [result, setResult] = useState('');
  const inFlight = useRef(false);
  useEffect(() => {
    if (!open) return;
    let live = true;
    api.get(`/tournament/equipo/${team._id}`).then(res => {
      if (live) setTournaments(res.data.filter(t => t.formato === 'liga' || t.tipo === 'liga'));
    }).catch(() => { if (live) setError('No se han podido cargar los torneos. Cierra y vuelve a abrir la importación.'); });
    return () => { live = false; };
  }, [open, team._id]);
  const names = useMemo(() => [...new Map([...directory.map(t => t.nombre), ...calendar.flatMap(m => [m.home, m.away])]
    .filter(n => teamKey(n) !== 'DESCANSA').map(n => [teamKey(n), n])).values()].sort(), [directory, calendar]);
  const matches = useMemo(() => matchesForTeam(calendar, ownName), [calendar, ownName]);
  const rivals = useMemo(() => names.filter(n => teamKey(n) !== teamKey(ownName)).map(nombre => ({
    nombre, ...directory.find(d => teamKey(d.nombre) === teamKey(nombre)),
  })), [names, directory, ownName]);
  const missing = rivals.filter(r => !r.escudo).length;

  async function read() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setResult(''); setReviewed(false);
    try {
      const { readFederationPdf } = await import('./readFederationPdf');
      const teams = directoryFile ? await readFederationPdf(directoryFile, 'directory', setProgress) : [];
      const fixtures = calendarFile ? await readFederationPdf(calendarFile, 'calendar', setProgress) : [];
      setDirectory(teams); setCalendar(fixtures);
      const candidates = [...teams.map(t => t.nombre), ...fixtures.flatMap(m => [m.home, m.away])];
      setOwnName(candidates.find(n => teamKey(n) === teamKey(team.nombre)) || '');
      setReviewed(true);
    } catch (e) { setError(e.message || 'No se ha podido leer el PDF.'); }
    finally { inFlight.current = false; setBusy(false); setProgress(''); }
  }

  async function addLogo(nombre, file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2 * 1024 * 1024) { setError('Usa una imagen PNG, JPG o WebP de hasta 2 MB.'); return; }
    const reader = new FileReader();
    reader.onerror = () => setError('No se ha podido leer el escudo.');
    reader.onload = () => setDirectory(prev => [...prev.filter(d => teamKey(d.nombre) !== teamKey(nombre)), { ...prev.find(d => teamKey(d.nombre) === teamKey(nombre)), nombre, escudo: reader.result }]);
    reader.readAsDataURL(file);
  }

  async function save() {
    if (inFlight.current || !ownName || (calendar.length && !tournamentId)) return;
    inFlight.current = true; setBusy(true); setError(''); setResult('');
    let createdRivals = 0, createdMatches = 0, skipped = 0;
    try {
      const [rivalRes, matchRes] = await Promise.all([api.get(`/rival/team/${team._id}`), api.get(`/match-sheet/equipo/${team._id}`)]);
      const existingMatchdays = new Set(matchRes.data
        .filter(m => String(m.torneoId?._id || m.torneoId) === tournamentId && (!m.fase || m.fase === 'liga'))
        .map(m => Number(m.jornada)));
      const existing = new Map(rivalRes.data.map(r => [teamKey(r.nombre), r]));
      for (let i = 0; i < rivals.length; i++) {
        const rival = rivals[i];
        setProgress(`Guardando rivales: ${i + 1} de ${rivals.length}`);
        let saved = existing.get(teamKey(rival.nombre));
        if (!saved) {
          saved = await dispatch(createRival({ nombre: rival.nombre, equipo: team._id, ...(rival.escudo ? { escudo: rival.escudo } : {}) })).unwrap();
          existing.set(teamKey(rival.nombre), saved); createdRivals++;
        } else if (!saved.escudo && rival.escudo) {
          saved = await dispatch(updateRival({ _id: saved._id, equipo: team._id, escudo: rival.escudo })).unwrap();
          existing.set(teamKey(rival.nombre), saved);
        }
        if (rival.escudo && !saved.escudo) throw new Error(`No se ha guardado el escudo de ${rival.nombre}. Vuelve a importar para completarlo.`);
      }
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        setProgress(`Creando fichas: ${i + 1} de ${matches.length}`);
        const duplicate = existingMatchdays.has(match.jornada);
        if (duplicate) { skipped++; continue; }
        const rival = existing.get(teamKey(match.rival));
        const venue = match.campo || directory.find(d => teamKey(d.nombre) === teamKey(match.home))?.campo || '';
        try {
          await dispatch(createMatchSheet({ equipo: team._id, torneoId: tournamentId, competicion: 'liga', fase: 'liga',
            jornada: match.jornada, rival: rival.nombre, rivalId: rival._id, rivalEscudo: rival.escudo || '',
            miEscudo: team.escudo || '', ubicacion: match.ubicacion, campo: venue,
            fechaHora: new Date(`${match.date}T00:00:00`).toISOString(),
            notasEntrenador: 'Importado del calendario federativo. Fecha de jornada orientativa; hora pendiente de confirmación.',
          })).unwrap();
          createdMatches++;
          existingMatchdays.add(match.jornada);
        } catch (e) { if (e?.code === 'DUPLICATE_TOURNAMENT_MATCHDAY') skipped++; else throw e; }
      }
      setResult(`Importación completada: ${createdRivals} rivales nuevos y ${createdMatches} fichas creadas. ${skipped} jornadas existentes conservadas.`);
    } catch (e) {
      setError(`${typeof e === 'string' ? e : e?.message || 'Error al guardar.'} Se han creado ${createdRivals} rivales y ${createdMatches} fichas. Puedes reintentar: se conservarán los datos existentes.`);
    } finally {
      await Promise.allSettled([dispatch(fetchRivalsByTeam(team._id)).unwrap(), dispatch(fetchMatchSheetsByTeam(team._id)).unwrap()]);
      inFlight.current = false; setBusy(false); setProgress(''); onImported?.();
    }
  }

  return <>
    <Button onClick={() => { setOpen(true); setError(''); }}>Importar PDF · FFRM</Button>
    <Modal open={open} onClose={busy ? undefined : () => setOpen(false)} title="Importar temporada desde PDF" width={960}
      footer={<Row $gap={8} $wrap><Button disabled={busy} onClick={() => setOpen(false)}>Cerrar</Button>
        <Button $variant="primary" disabled={busy || !reviewed || !ownName || Boolean(calendar.length && (!tournamentId || !matches.length)) || Boolean(result)} onClick={save}>Importar {rivals.length} rivales{calendar.length ? ` y ${matches.length} partidos` : ''}</Button></Row>}>
      <Stack $gap={16}>
        <Notice><strong>Por ahora, solo disponible para la FFRM (Federación de Fútbol de la Región de Murcia).</strong><br />Equipo de Xtramys: <strong>{team.nombre}</strong>. Sube el directorio para extraer los escudos y el calendario para crear las fichas.</Notice>
        <Form>
          <label>Directorio de equipos (PDF)<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e => { setDirectoryFile(e.target.files[0] || null); setReviewed(false); setResult(''); }} /></label>
          <label>Calendario de competición (PDF)<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e => { setCalendarFile(e.target.files[0] || null); setReviewed(false); setResult(''); }} /></label>
          <Button disabled={busy || (!directoryFile && !calendarFile)} onClick={read}>Leer PDF y preparar vista previa</Button>
          {reviewed && <>
            <label>¿Qué equipo eres en el PDF?<select disabled={busy} value={ownName} onChange={e => { setOwnName(e.target.value); setResult(''); }}><option value="">Selecciona tu equipo</option>{names.map(n => <option key={n}>{n}</option>)}</select></label>
            {calendar.length > 0 && <label>Torneo de Xtramys<select disabled={busy} value={tournamentId} onChange={e => { setTournamentId(e.target.value); setResult(''); }}><option value="">Selecciona una liga existente</option>{tournaments.map(t => <option key={t._id} value={t._id}>{t.nombre}</option>)}</select><Muted>Si no aparece, crea un torneo con formato liga en la sección Torneos.</Muted></label>}
          </>}
        </Form>
        {reviewed && ownName && <>
          <Notice><strong>{rivals.length} rivales · {matches.length} partidos</strong>{calendar.length > 0 && <> · {matches.filter(m => m.ubicacion === 'Casa').length} en casa · {matches.filter(m => m.ubicacion === 'Fuera').length} fuera. Los descansos se omiten. Las fechas son las de cada jornada; se guardan a las 00:00 con una nota de hora pendiente.</>}
            {missing > 0 && <p>{missing === 1 ? '1 rival no tiene escudo' : `${missing} rivales no tienen escudo`} en el directorio. Puedes añadirlo aquí; si continúas, {missing === 1 ? 'se creará' : 'se crearán'} sin imagen.</p>}
          </Notice>
          <Preview><table><thead><tr><th>Escudo</th><th>Rival</th><th>Imagen pendiente</th></tr></thead><tbody>{rivals.map(r => <tr key={r.nombre}><td>{r.escudo ? <img src={r.escudo} alt={`Escudo de ${r.nombre}`} /> : '—'}</td><td>{r.nombre}</td><td>{!r.escudo && <input disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Añadir escudo de ${r.nombre}`} onChange={e => addLogo(r.nombre, e.target.files[0])} />}</td></tr>)}</tbody></table></Preview>
          {matches.length > 0 && <Preview><table><thead><tr><th>Jornada</th><th>Fecha</th><th>Rival</th><th>Ubicación</th></tr></thead><tbody>{matches.map(m => <tr key={m.jornada}><td>{m.jornada}</td><td>{m.date.split('-').reverse().join('/')}</td><td>{m.rival}</td><td>{m.ubicacion}</td></tr>)}</tbody></table></Preview>}
          <Muted>Se conservan las fichas existentes del mismo torneo y jornada y los escudos ya guardados. Si hay un error, puedes reintentar la importación.</Muted>
        </>}
        {progress && <Notice role="status" aria-live="polite">{progress}</Notice>}
        {error && <Notice role="alert">{error}</Notice>}
        {result && <Notice role="status">{result}</Notice>}
      </Stack>
    </Modal>
  </>;
}
