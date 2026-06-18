/**
 * Parches en runtime sobre react-native-web para módulos cuyos métodos
 * vienen no-op o ruidosos (Alert, BackHandler). Importar UNA SOLA VEZ
 * lo antes posible (en main.jsx, antes de cargar componentes).
 */
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = globalThis.Buffer || Buffer;
}

import { Alert, BackHandler } from 'react-native';
import i18n from '../i18n';

const TOAST_ROOT_ID = 'xtramys-toast-root';
const TOAST_CENTER_ROOT_ID = 'xtramys-toast-center-root';
const TOAST_STYLE_ID = 'xtramys-toast-styles';

function normalizeAlertText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getButtonLabel(button, fallback) {
  return normalizeAlertText(button?.text).trim() || fallback;
}

function inferToastTone(title, message, buttons) {
  if (Array.isArray(buttons) && buttons.some((button) => button?.style === 'destructive')) {
    return 'warning';
  }

  const text = `${title} ${message}`.toLowerCase();
  if (/error|err[oó]r|fall[oó]|failed|denegad|inv[aá]lid|no se pudo|no hay|cannot|could not/.test(text)) return 'error';
  if (/[eé]xito|success|guardad|cread|actualizad|eliminad|saved|done|completad/.test(text)) return 'success';
  if (/warning|aviso|advertencia|atenci[oó]n|permiso|confirm|seguro|eliminar|borrar|delete/.test(text)) return 'warning';
  return 'info';
}

function ensureToastStyles() {
  if (typeof document === 'undefined' || document.getElementById(TOAST_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = TOAST_STYLE_ID;
  style.textContent = `
    #${TOAST_ROOT_ID} {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483600;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: min(420px, calc(100vw - 32px));
      pointer-events: none;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #${TOAST_CENTER_ROOT_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483600;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px;
      pointer-events: none;
      background: rgba(15, 23, 42, 0);
      transition: background 140ms ease;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #${TOAST_CENTER_ROOT_ID}.xtramys-toast-root--active {
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.3);
    }
    .xtramys-toast {
      display: grid;
      grid-template-columns: 4px 32px 1fr auto;
      gap: 12px;
      align-items: flex-start;
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.26);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.98);
      color: #0f172a;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08);
      padding: 12px;
      pointer-events: auto;
      opacity: 0;
      transform: translate3d(18px, -6px, 0) scale(0.98);
      transition: opacity 160ms ease, transform 160ms ease;
      overflow: hidden;
    }
    #${TOAST_CENTER_ROOT_ID} .xtramys-toast {
      width: min(560px, calc(100vw - 32px));
      max-width: min(560px, calc(100vw - 32px));
      transform: translate3d(0, 12px, 0) scale(0.98);
    }
    #${TOAST_CENTER_ROOT_ID} .xtramys-toast[data-state="visible"] {
      transform: translate3d(0, 0, 0) scale(1);
    }
    #${TOAST_CENTER_ROOT_ID} .xtramys-toast[data-state="closing"] {
      transform: translate3d(0, 12px, 0) scale(0.98);
    }
    .xtramys-toast[data-state="visible"] {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
    .xtramys-toast[data-state="closing"] {
      opacity: 0;
      transform: translate3d(18px, -6px, 0) scale(0.98);
    }
    .xtramys-toast__bar {
      align-self: stretch;
      width: 4px;
      border-radius: 999px;
      background: var(--xtramys-toast-accent);
    }
    .xtramys-toast__icon {
      width: 32px;
      height: 32px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--xtramys-toast-soft);
      color: var(--xtramys-toast-accent);
      font-size: 17px;
      font-weight: 800;
      line-height: 1;
    }
    .xtramys-toast__content {
      min-width: 0;
      padding-top: 1px;
    }
    .xtramys-toast__title {
      margin: 0;
      color: #0f172a;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.35;
    }
    .xtramys-toast__message {
      margin: 3px 0 0;
      color: #475569;
      font-size: 13px;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .xtramys-toast__close {
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
    }
    .xtramys-toast__close:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .xtramys-toast__actions {
      grid-column: 3 / 5;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 2px;
    }
    .xtramys-toast__button {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #334155;
      padding: 7px 11px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .xtramys-toast__button:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .xtramys-toast__button--primary {
      border-color: var(--xtramys-toast-accent);
      background: var(--xtramys-toast-accent);
      color: #ffffff;
    }
    .xtramys-toast__button--primary:hover {
      filter: brightness(0.96);
    }
    .xtramys-toast__button--destructive {
      border-color: #b91c1c;
      background: #b91c1c;
      color: #ffffff;
    }
    .xtramys-toast--success {
      --xtramys-toast-accent: #15803d;
      --xtramys-toast-soft: #dcfce7;
    }
    .xtramys-toast--error {
      --xtramys-toast-accent: #b91c1c;
      --xtramys-toast-soft: #fee2e2;
    }
    .xtramys-toast--warning {
      --xtramys-toast-accent: #b45309;
      --xtramys-toast-soft: #fef3c7;
    }
    .xtramys-toast--info {
      --xtramys-toast-accent: #0369a1;
      --xtramys-toast-soft: #e0f2fe;
    }
    @media (prefers-color-scheme: dark) {
      .xtramys-toast {
        background: rgba(22, 32, 56, 0.98);
        color: #f1f5fb;
        border-color: rgba(148, 163, 184, 0.22);
        box-shadow: 0 18px 45px rgba(0, 0, 0, 0.34), 0 4px 12px rgba(0, 0, 0, 0.22);
      }
      .xtramys-toast__title { color: #f1f5fb; }
      .xtramys-toast__message { color: #cbd5e1; }
      .xtramys-toast__close { color: #94a3b8; }
      .xtramys-toast__close:hover { background: rgba(148, 163, 184, 0.16); color: #f8fafc; }
      .xtramys-toast__button { background: #1c2742; border-color: #3b4970; color: #e2e8f0; }
      .xtramys-toast__button:hover { background: #22304f; border-color: #64748b; }
    }
    @media (max-width: 600px) {
      #${TOAST_ROOT_ID} {
        top: 12px;
        right: 12px;
        left: 12px;
        width: auto;
      }
      .xtramys-toast {
        grid-template-columns: 4px 30px 1fr auto;
        padding: 11px;
      }
      .xtramys-toast__actions {
        justify-content: stretch;
      }
      .xtramys-toast__button {
        flex: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureToastRoot(placement = 'top-right') {
  if (typeof document === 'undefined') return null;
  ensureToastStyles();
  const rootId = placement === 'center' ? TOAST_CENTER_ROOT_ID : TOAST_ROOT_ID;
  let root = document.getElementById(rootId);
  if (!root) {
    root = document.createElement('div');
    root.id = rootId;
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(root);
  }
  return root;
}

function dismissToast(toast) {
  if (!toast || toast.dataset.state === 'closing') return;
  const parent = toast.parentElement;
  toast.dataset.state = 'closing';
  window.setTimeout(() => {
    toast.remove();
    if (parent && parent.id === TOAST_CENTER_ROOT_ID && parent.childElementCount === 0) {
      parent.classList.remove('xtramys-toast-root--active');
    }
  }, 180);
}

function callButton(button, value) {
  if (typeof button?.onPress !== 'function') return;
  try {
    button.onPress(value);
  } catch (error) {
    console.error(error);
  }
}

function resolveToastPlacement({ tone, buttons, placement }) {
  if (placement === 'center' || placement === 'top-right') return placement;
  if (Array.isArray(buttons) && buttons.length > 0) return 'center';
  return tone === 'success' || tone === 'error' ? 'top-right' : 'center';
}

function showToast({ title, message, tone = 'info', buttons = [], duration, onClose, placement }) {
  const resolvedPlacement = resolveToastPlacement({ tone, buttons, placement });
  const root = ensureToastRoot(resolvedPlacement);

  if (!root) {
    return null;
  }

  const toast = document.createElement('div');
  toast.className = `xtramys-toast xtramys-toast--${tone}`;
  toast.dataset.state = 'entering';
  toast.setAttribute('role', buttons.length > 0 ? 'alertdialog' : (tone === 'error' ? 'alert' : 'status'));

  const bar = document.createElement('div');
  bar.className = 'xtramys-toast__bar';

  const icon = document.createElement('div');
  icon.className = 'xtramys-toast__icon';
  icon.textContent = tone === 'success' ? 'OK' : tone === 'error' ? '!' : tone === 'warning' ? '!' : 'i';

  const content = document.createElement('div');
  content.className = 'xtramys-toast__content';

  if (title) {
    const titleNode = document.createElement('p');
    titleNode.className = 'xtramys-toast__title';
    titleNode.textContent = title;
    content.appendChild(titleNode);
  }

  if (message) {
    const messageNode = document.createElement('p');
    messageNode.className = 'xtramys-toast__message';
    messageNode.textContent = message;
    content.appendChild(messageNode);
  }

  const closeButton = document.createElement('button');
  closeButton.className = 'xtramys-toast__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', i18n.t('message.closeNotification', 'Cerrar notificación'));
  closeButton.textContent = 'x';
  closeButton.addEventListener('click', () => {
    dismissToast(toast);
    if (typeof onClose === 'function') onClose();
  });

  toast.append(bar, icon, content, closeButton);

  if (buttons.length > 0) {
    const actions = document.createElement('div');
    actions.className = 'xtramys-toast__actions';
    buttons.forEach((button, index) => {
      const action = document.createElement('button');
      const isPrimary = button?.style !== 'cancel' && button?.style !== 'destructive';
      action.className = [
        'xtramys-toast__button',
        isPrimary ? 'xtramys-toast__button--primary' : '',
        button?.style === 'destructive' ? 'xtramys-toast__button--destructive' : '',
      ].filter(Boolean).join(' ');
      action.type = 'button';
      action.textContent = getButtonLabel(button, index === 0 ? 'Cancelar' : 'Aceptar');
      action.addEventListener('click', () => {
        dismissToast(toast);
        callButton(button);
      });
      actions.appendChild(action);
    });
    toast.appendChild(actions);
  }

  root.appendChild(toast);
  if (resolvedPlacement === 'center') {
    root.classList.add('xtramys-toast-root--active');
  }
  window.requestAnimationFrame(() => { toast.dataset.state = 'visible'; });

  if (!buttons.length && duration !== null) {
    window.setTimeout(() => dismissToast(toast), duration || (tone === 'error' ? 7000 : 4800));
  }

  return { dismiss: () => dismissToast(toast) };
}

function showAlertToast(title, message, buttons) {
  const toastTitle = normalizeAlertText(title).trim();
  const toastMessage = normalizeAlertText(message).trim();
  const toastButtons = Array.isArray(buttons) ? buttons.filter(Boolean) : [];
  const tone = inferToastTone(toastTitle, toastMessage, toastButtons);

  if (toastButtons.length === 0) {
    showToast({ title: toastTitle, message: toastMessage, tone });
    return;
  }

  if (toastButtons.length === 1 && typeof toastButtons[0]?.onPress !== 'function') {
    showToast({ title: toastTitle, message: toastMessage, tone });
    return;
  }

  const cancelButton = toastButtons.find((button) => button?.style === 'cancel');
  showToast({
    title: toastTitle,
    message: toastMessage,
    tone,
    buttons: toastButtons,
    duration: null,
    onClose: cancelButton ? () => callButton(cancelButton) : undefined,
  });
}

function showConfirmToast(message, options = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const titleText = options.title || i18n.t('message.confirmAction', 'Confirmar acción');
    const cancelBtnText = options.cancelText || i18n.t('message.cancel', 'Cancelar');
    const confirmBtnText = options.confirmText || i18n.t('message.accept', 'Aceptar');

    showToast({
      title: normalizeAlertText(titleText).trim(),
      message: normalizeAlertText(message).trim(),
      tone: options.tone || 'warning',
      duration: null,
      buttons: [
        { text: cancelBtnText, style: 'cancel', onPress: () => settle(false) },
        { text: confirmBtnText, style: options.destructive ? 'destructive' : 'default', onPress: () => settle(true) },
      ],
      onClose: () => settle(false),
    });
  });
}

if (typeof window !== 'undefined') {
  window.__xtramysToast = window.__xtramysToast || showToast;
  window.__xtramysConfirm = window.__xtramysConfirm || showConfirmToast;
  window.alert = function toastWindowAlert(message) {
    const text = normalizeAlertText(message).trim();
    showToast({ title: text, tone: inferToastTone(text, '', []) });
  };
}

// --- Alert.alert: RNW lo deja vacío. Lo redirigimos a un toast visual con
// acciones, manteniendo los callbacks de confirmación existentes.
if (Alert && (!Alert._patchedWeb)) {
  Alert.alert = function alertWeb(title, message, buttons, _options) {
    showAlertToast(title, message, buttons);
  };
  Alert.prompt = Alert.prompt || function (title, message, callbackOrButtons, _type, defaultValue) {
    const text = [title, message].filter(Boolean).join('\n\n');
    let result = null;
    try { result = window.prompt(text, defaultValue || ''); } catch {}
    if (typeof callbackOrButtons === 'function') {
      try { callbackOrButtons(result); } catch (e) { console.error(e); }
    } else if (Array.isArray(callbackOrButtons)) {
      const okBtn = callbackOrButtons.find(b => b && b.style !== 'cancel') || callbackOrButtons[0];
      const cb = okBtn && okBtn.onPress;
      if (typeof cb === 'function') {
        try { cb(result); } catch (e) { console.error(e); }
      }
    }
  };
  Alert._patchedWeb = true;
}

// --- BackHandler: en RNW imprime console.error en cada add/remove. Como
// no podemos interceptar el botón "atrás" del navegador de forma fiable
// (popstate ya navegó cuando se dispara), simplemente silenciamos para
// que no inunde la consola. Devolvemos un suscriptor inerte.
if (BackHandler && (!BackHandler._patchedWeb)) {
  const noopSub = { remove: () => {} };
  BackHandler.addEventListener = () => noopSub;
  BackHandler.removeEventListener = () => {};
  BackHandler.exitApp = () => {};
  BackHandler._patchedWeb = true;
}

// (Filtro de console.warn/error movido a index.html para que aplique antes
// de cualquier import de módulos de RNW.)

// (Eliminado warmUp sintético: disparaba pointerdown en body y la pizarra
// lo interpretaba como "click fuera", cerrando paneles. Para el problema
// del primer click sobre TouchableOpacity ver patch en `react-native.js`.)
