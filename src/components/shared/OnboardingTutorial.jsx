import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled, { createGlobalStyle } from 'styled-components';
import { TUTORIAL_TASKS, PLAYER_FIELDS, advanceTask } from './tutorialSteps';
import { toast } from '@/ui/toast';
import { FiCompass, FiArrowRight, FiCheck, FiMinus, FiLock } from 'react-icons/fi';

const GuideStyles = createGlobalStyle`
  body[data-guided-tutorial] [data-tutorial-highlight] {
    outline: 3px solid ${({theme}) => theme.colors.primary}; outline-offset: 4px;
  }
  body[data-guided-tutorial] #root { padding-right: 350px; }
  body[data-guided-tutorial] [role="dialog"]:not([data-tutorial-panel]) { margin-right: 350px; max-width: calc(100vw - 380px); }
  body[data-guided-tutorial] [data-testid$="-form"] { max-width: calc(100vw - 390px); }
  body[data-guided-tutorial] [data-tutorial-exit], body[data-guided-tutorial] [data-testid="tutorial-exit"] { opacity: .4; }
  body[data-guided-tutorial] [inert] button, body[data-guided-tutorial] button[inert] { opacity: .4; }
  @media(max-width: 800px) {
    body[data-guided-tutorial] #root { padding-right: 0; padding-bottom: 260px; }
    body[data-guided-tutorial] [role="dialog"]:not([data-tutorial-panel]) { margin-right: 0; max-width: 100vw; min-height: 0; height: calc(100dvh - 260px); max-height: calc(100dvh - 260px); align-self: flex-start; }
    body[data-guided-tutorial] [data-testid$="-form"] { max-width: 100vw; max-height: calc(100dvh - 260px); }
  }
  @media(prefers-reduced-motion: reduce) { body[data-guided-tutorial] * { scroll-behavior: auto !important; } }
`;
const Panel = styled.aside`
  position: fixed; top: 20px; right: 16px; width: 318px; max-height: calc(100dvh - 40px);
  overflow-y: auto; z-index: 2147483647; border-radius: 22px;
  border: 1px solid ${({theme}) => theme.colors.border};
  background: ${({theme}) => theme.colors.surface}; color: ${({theme}) => theme.colors.text};
  box-shadow: 0 24px 64px rgba(15,23,42,.22);
  .guide-header { display: flex; align-items: center; gap: 12px; padding: 16px;
    background: ${({theme}) => theme.colors.primarySoft}; color: ${({theme}) => theme.colors.primarySoftText};
    border-bottom: 1px solid ${({theme}) => theme.colors.border}; }
  .guide-mark { width: 36px; height: 36px; display: grid; place-items: center; flex-shrink: 0;
    border-radius: 13px; background: ${({theme}) => theme.colors.primary}; color: ${({theme}) => theme.colors.onPrimary}; }
  .guide-header strong { display: block; font-size: 15px; letter-spacing: -.02em; }
  .guide-header small { display: block; margin-top: 4px; font-size: 12px; }
  .guide-content { padding: 16px; }
  .guide-progress { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
    font-size: 12px; font-weight: 600; color: ${({theme}) => theme.colors.textSecondary}; }
  progress { display: block; width: 100%; height: 6px; margin: 0 0 12px; border: 0; border-radius: 99px;
    overflow: hidden; appearance: none; background: ${({theme}) => theme.colors.backgroundAlt}; }
  progress::-webkit-progress-bar { background: ${({theme}) => theme.colors.backgroundAlt}; }
  progress::-webkit-progress-value { background: ${({theme}) => theme.colors.primary}; border-radius: 99px; }
  progress::-moz-progress-bar { background: ${({theme}) => theme.colors.primary}; }
  .guide-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;
    letter-spacing: .07em; text-transform: uppercase; color: ${({theme}) => theme.colors.primary}; }
  h2 { margin: 8px 0 12px; font-size: 23px; letter-spacing: -.035em; line-height: 1.2; }
  p { margin: 12px 0; font-size: 14px; line-height: 1.65; color: ${({theme}) => theme.colors.textSecondary}; }
  .guide-instruction { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; padding: 12px;
    border-radius: 12px; border: 1px solid ${({theme}) => theme.colors.border}; background: ${({theme}) => theme.colors.surfaceAlt}; }
  .guide-instruction svg { flex-shrink: 0; margin-top: 3px; color: ${({theme}) => theme.colors.primary}; }
  .guide-instruction p { margin: 0; font-size: 13px; }
  button { width: 100%; min-height: 44px; margin: 0; padding: 11px 10px; border-radius: 10px;
    border: 1px solid ${({theme}) => theme.colors.borderStrong}; background: ${({theme}) => theme.colors.surface};
    color: ${({theme}) => theme.colors.textSecondary}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  button[data-primary] { background: ${({theme}) => theme.colors.primary}; color: ${({theme}) => theme.colors.onPrimary}; border-color: ${({theme}) => theme.colors.primary}; }
  button:hover:not(:disabled) { background: ${({theme}) => theme.colors.backgroundAlt}; }
  button[data-primary]:hover:not(:disabled) { background: ${({theme}) => theme.colors.primaryHover}; }
  button:focus-visible, summary:focus-visible { outline: 3px solid ${({theme}) => theme.colors.focusRing}; outline-offset: 3px; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  [data-tutorial-actions] { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
  button[data-primary], [data-has-field] button[data-skip-tutorial] { grid-column: 1 / -1; }
  button[data-skip-tutorial] { border-color: transparent; background: transparent; color: ${({theme}) => theme.colors.textMuted}; }
  details { margin-top: 12px; padding-top: 12px; border-top: 1px solid ${({theme}) => theme.colors.border}; }
  summary { cursor: pointer; font-size: 13px; font-weight: 700; color: ${({theme}) => theme.colors.text}; }
  ol { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 4px; }
  li { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 11px;
    border: 1px solid transparent; }
  li[aria-current="step"] { background: ${({theme}) => theme.colors.primarySoft}; border-color: ${({theme}) => theme.colors.border}; }
  .step-marker { display: grid; place-items: center; flex-shrink: 0; width: 28px; height: 28px;
    border-radius: 50%; background: ${({theme}) => theme.colors.backgroundAlt}; color: ${({theme}) => theme.colors.textSecondary}; font-size: 12px; font-weight: 700; }
  li[aria-current="step"] .step-marker { background: ${({theme}) => theme.colors.primary}; color: ${({theme}) => theme.colors.onPrimary}; }
  li[data-status="completed"] .step-marker { background: ${({theme}) => theme.colors.successSoft}; color: ${({theme}) => theme.colors.successSoftText}; }
  .step-copy { flex: 1; min-width: 0; }
  .step-copy strong { display: block; font-size: 12px; font-weight: 600; line-height: 1.4; }
  .step-copy small { display: block; margin-top: 3px; font-size: 11px; color: ${({theme}) => theme.colors.textMuted}; }
  li[aria-current="step"] .step-copy small { color: ${({theme}) => theme.colors.primarySoftText}; }
  .guide-note { display: flex; gap: 8px; padding: 12px 16px; background: ${({theme}) => theme.colors.surfaceAlt};
    border-top: 1px solid ${({theme}) => theme.colors.border}; }
  .guide-note svg { margin-top: 3px; flex-shrink: 0; color: ${({theme}) => theme.colors.textMuted}; }
  .guide-note p { margin: 0; font-size: 12px; line-height: 1.6; }
  @media(max-width: 800px) { top: auto; bottom: 0; right: 0; width: 100%; max-height: 250px; border-radius: 20px 20px 0 0;
    .guide-header, .guide-progress, progress, .guide-eyebrow { display: none; }
    .guide-content { padding: 14px 18px; } h2 { margin: 0 0 10px; font-size: 20px; }
    .guide-instruction { padding: 10px; margin-bottom: 12px; }
    button { min-height: 44px; } button[data-primary] { grid-column: auto; }
    [data-has-field] button[data-skip-tutorial], button[data-skip-tutorial] { grid-column: auto; }
    button[data-skip-tutorial]:nth-child(3) { grid-column: 1 / -1; }
    .guide-note { padding-bottom: max(16px,env(safe-area-inset-bottom)); }
  }
`;
const focusable = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex]:not([tabindex="-1"])';
const selector = id => `[data-tutorial="${id}"], [data-testid="tutorial-${id}"]`;

export default function OnboardingTutorial({session, onChange, onComplete}) {
  const {i18n} = useTranslation();
  const es = !i18n.language?.startsWith('en');
  const text = (spanish, english) => es ? spanish : english;
  const lang = es ? 0 : 1;
  const navigate = useNavigate();
  const location = useLocation();
  const panel = useRef(null);
  const [targets, setTargets] = useState([]);
  const [validation, setValidation] = useState('');
  const task = TUTORIAL_TASKS[session.task];
  const field = task?.id === 'player' && session.phase > 0 ? PLAYER_FIELDS[session.phase - 1] : null;
  const saving = task?.id === 'player' && session.phase === PLAYER_FIELDS.length + 1;
  const editingBoard = task?.id === 'exercise' && session.phase > 0 && location.pathname === '/tactical-board';
  const targetId = editingBoard ? 'exercise-board' : session.phase === 0 ? `${task?.id}-open` : task?.id === 'player'
    ? saving ? 'player-save' : `player-${field?.[0]}` : `${task?.id}-form`;

  useEffect(() => {
    if (!task) { onComplete(); return; }
    if (location.pathname !== task.path && !editingBoard) navigate(task.path, {replace: true});
  }, [task, location.pathname, editingBoard, navigate, onComplete]);
  useEffect(() => {
    if (!task) return;
    setValidation('');
    const update = () => {
      const found = [...document.querySelectorAll(selector(targetId))].filter(node => node.getClientRects().length);
      setTargets(previous => previous.length === found.length && previous.every((node,index) => node === found[index]) ? previous : found);
      if (session.phase === 0 && document.querySelector(selector(`${task?.id}-form`))) onChange({...session, phase: 1});
      // A refresh can close an unfinished form. Reopen it through the same guided create button.
      if (session.phase > 0 && !document.querySelector(selector(`${task?.id}-form`)) && document.querySelector(selector(`${task?.id}-open`))) onChange({...session, phase: 0});
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {childList: true, subtree: true});
    return () => observer.disconnect();
  }, [targetId, session, task, onChange]);
  useEffect(() => {
    const created = event => { if (event.detail === task?.id) onChange(advanceTask(session, 'completed')); };
    window.addEventListener('xtramys:tutorial-created', created);
    return () => window.removeEventListener('xtramys:tutorial-created', created);
  }, [session, task, onChange]);
  useEffect(() => toast.subscribe(message => {
    if (message.type === 'error') setValidation(message.message);
  }), []);

  useEffect(() => {
    const previousFocus = document.activeElement;
    document.body.dataset.guidedTutorial = 'true';
    return () => {
      delete document.body.dataset.guidedTutorial;
      if (previousFocus?.isConnected) previousFocus.focus?.();
    };
  }, []);
  useEffect(() => {
    if (!task) return;
    const modified = new Map();
    const described = new Map();
    const dialogs = new Map();
    const highlighted = new Set();
    let allowed = [];
    const restore = () => {
      modified.forEach((wasInert,node) => { node.inert = wasInert; }); modified.clear();
      described.forEach((value,node) => value === null ? node.removeAttribute('aria-describedby') : node.setAttribute('aria-describedby',value)); described.clear();
      dialogs.forEach((value,node) => value === null ? node.removeAttribute('aria-modal') : node.setAttribute('aria-modal',value)); dialogs.clear();
      highlighted.forEach(node => node.removeAttribute('data-tutorial-highlight')); highlighted.clear();
    };
    const protect = () => {
      restore();
      const form = document.querySelector(selector(`${task?.id}-form`));
      const canUseAuxiliary = session.phase > 0 && form && (task?.id !== 'player' || field?.[0] === 'photo');
      const auxiliary = canUseAuxiliary ? [...document.querySelectorAll('[role="dialog"], [data-tutorial="image-cropper"]')]
        .filter(node => !node.contains(form) && !node.contains(panel.current)) : [];
      allowed = [panel.current, ...targets, ...auxiliary].filter(Boolean);
      const readable = [...allowed, ...document.querySelectorAll('[role="alert"]')];
      document.querySelectorAll('[role="dialog"]').forEach(node => {
        dialogs.set(node,node.getAttribute('aria-modal')); node.setAttribute('aria-modal','false');
      });
      const walk = node => {
        if (readable.some(root => root === node || root.contains(node))) return;
        if (readable.some(root => node.contains(root))) { [...node.children].forEach(walk); return; }
        if (node instanceof HTMLElement && !['STYLE','SCRIPT','LINK'].includes(node.tagName)) {
          modified.set(node, node.inert); node.inert = true;
        }
      };
      [...document.body.children].forEach(walk);
      document.querySelectorAll('[data-tutorial-exit], [data-testid="tutorial-exit"]').forEach(node => {
        if (!node.closest('[inert]')) {modified.set(node,node.inert); node.inert = true;}
      });
      targets.forEach(node => {
        node.setAttribute('data-tutorial-highlight',''); highlighted.add(node);
        const controls = [node, ...node.querySelectorAll(focusable)].filter(control => control.matches(focusable));
        controls.forEach(control => {described.set(control,control.getAttribute('aria-describedby')); control.setAttribute('aria-describedby', `${control.getAttribute('aria-describedby') || ''} tutorial-instruction`.trim());});
      });
    };
    const permitted = node => node instanceof Element && !node.closest('[data-tutorial-exit], [data-testid="tutorial-exit"]') && allowed.some(root => root.contains(node));
    const block = event => {
      if (!permitted(event.target)) {event.preventDefault(); event.stopImmediatePropagation();}
    };
    const keys = event => {
      if (event.key === 'Escape') {event.preventDefault(); event.stopImmediatePropagation(); panel.current?.querySelector('[data-skip-tutorial]')?.focus(); return;}
      if (event.key === 'Tab') {
        const controls = [...document.querySelectorAll(focusable)].filter(node => permitted(node) && !node.closest('[inert]') && node.getClientRects().length);
        const index = controls.indexOf(document.activeElement);
        if (controls.length) {event.preventDefault(); event.stopImmediatePropagation(); controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();}
      } else if (!permitted(event.target)) block(event);
    };
    const focus = event => {if (!permitted(event.target)) panel.current?.focus();};
    protect();
    if (panel.current) panel.current.scrollTop = 0;
    const observer = new MutationObserver(protect);
    observer.observe(document.body, {childList: true, subtree: true});
    for (const name of ['click','pointerdown','submit']) document.addEventListener(name, block, true);
    document.addEventListener('keydown', keys, true);
    document.addEventListener('focusin', focus, true);
    const first = targets[0];
    first?.scrollIntoView({block: 'center', behavior: 'instant'});
    (first?.matches(focusable) ? first : first?.querySelector(focusable))?.focus();
    if (!first) panel.current?.focus();
    return () => {
      observer.disconnect(); restore();
      for (const name of ['click','pointerdown','submit']) document.removeEventListener(name, block, true);
      document.removeEventListener('keydown', keys, true); document.removeEventListener('focusin', focus, true);
    };
  }, [targets, session.phase, task, field]);

  if (!task) return null;
  const nextField = () => {
    if (document.querySelector('[data-tutorial="image-cropper"]')) {
      setValidation(text('Guarda o cancela el recorte de la foto antes de continuar.', 'Save or cancel photo cropping before continuing.')); return;
    }
    if (field?.[3] && !targets[0]?.querySelector('input')?.value.trim()) {
      setValidation(text('Completa este campo obligatorio o salta la tarea de crear jugador.', 'Complete this required field or skip the create-player task.'));
      targets[0]?.querySelector('input')?.focus(); return;
    }
    onChange({...session, phase: session.phase + 1});
  };
  return createPortal(<><GuideStyles /><Panel ref={panel} data-tutorial-panel tabIndex={-1} aria-label={text('Tutorial guiado', 'Guided tutorial')}>
    <header className="guide-header">
      <span className="guide-mark"><FiCompass size={22} aria-hidden="true" /></span>
      <div><strong>{text('Tutorial de Xtramys', 'Xtramys tutorial')}</strong><small>{text('Aprende creando, paso a paso', 'Learn by creating, step by step')}</small></div>
    </header>
    <div className="guide-content">
    <div className="guide-progress"><span>{text('Tu recorrido', 'Your journey')}</span><span>{session.task} / {TUTORIAL_TASKS.length}</span></div>
    <progress value={session.task} max={TUTORIAL_TASKS.length} aria-label={text('Tareas terminadas o saltadas', 'Completed or skipped tasks')} />
    <div aria-live="polite" aria-atomic="true">
      <span className="guide-eyebrow">{text(`Paso ${session.task + 1} de ${TUTORIAL_TASKS.length}`, `Step ${session.task + 1} of ${TUTORIAL_TASKS.length}`)}</span>
      <h2>{task.title[lang]}</h2>
      <div className="guide-instruction"><FiArrowRight size={17} aria-hidden="true" /><p id="tutorial-instruction">{editingBoard ? text('Diseña tu ejercicio y pulsa Guardar para volver al formulario. También puedes cancelar el dibujo y continuar sin imagen.', 'Design your exercise and select Save to return to the form. You can also cancel the drawing and continue without an image.') : session.phase === 0 ? text('Pulsa el botón resaltado para abrir el formulario.', 'Select the highlighted button to open the form.')
        : field ? text(`Completa: ${field[1]}. Después pulsa Continuar.`, `Enter: ${field[2]}. Then select Continue.`)
        : saving ? text('Pulsa Crear en el formulario. Avanzaremos cuando el jugador se guarde correctamente.', 'Select Create in the form. We will continue after the player is saved successfully.') : task.hint[lang]}</p></div>
    </div>
    {validation && <p role="alert">{validation}</p>}
    {!targets.length && <p role="status">{text('Esperando el formulario. Si no está disponible, puedes saltar esta tarea o salir del tutorial.', 'Waiting for the form. If it is unavailable, skip this task or exit the tutorial.')}</p>}
    <div data-tutorial-actions data-has-field={field || saving ? 'true' : undefined}>
    {saving && <button onClick={() => onChange({...session, phase: 1})}>{text('Revisar datos del jugador', 'Review player details')}</button>}
    {field && <button data-primary onClick={nextField} disabled={!targets.length}>{text('Continuar', 'Continue')}</button>}
    {field && !field[3] && <button onClick={nextField}>{text('Saltar este campo', 'Skip this field')}</button>}
    <button onClick={() => onChange(advanceTask(session,'skipped'))}>{text('Saltar esta tarea', 'Skip this task')}</button>
    <button data-skip-tutorial onClick={onComplete}>{text('Saltar tutorial y salir', 'Skip tutorial and exit')}</button>
    </div>
    <details open><summary>{text('Tu progreso y tareas pendientes', 'Your progress and remaining tasks')}</summary><ol role="list">
      {TUTORIAL_TASKS.map((item,index) => <li role="listitem" key={item.id} data-status={session.outcomes[index]} aria-current={session.task === index ? 'step' : undefined}>
        <span className="step-marker" aria-hidden="true">{session.outcomes[index] === 'completed' ? <FiCheck size={15} /> : session.outcomes[index] === 'skipped' ? <FiMinus size={15} /> : index + 1}</span>
        <span className="step-copy"><strong>{item.title[lang]}</strong><small>{session.outcomes[index] === 'completed' ? text('Realizada', 'Completed') : session.outcomes[index] === 'skipped' ? text('Saltada', 'Skipped') : session.task === index ? text('En curso', 'In progress') : text('Pendiente', 'Pending')}</small></span>
      </li>)}
    </ol></details>
    </div>
    <footer className="guide-note"><FiLock size={14} aria-hidden="true" /><p>{text('Sigue el paso resaltado. Puedes saltar la guía; lo que guardes quedará en tu cuenta.', 'Follow the highlighted step. You can skip the guide; saved data stays in your account.')}</p></footer>
  </Panel></>, document.body);
}
