import i18n from '@/i18n';

const canNativeShare = () => (
  typeof window !== 'undefined' &&
  (!!window.Capacitor || (typeof navigator !== 'undefined' && typeof navigator.share === 'function'))
);

const el = (tag, style = {}, attrs = {}, text = '') => {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (text) node.textContent = text;
  return node;
};

export function showFileActions({ fileName, title, kind = 'file', onDownload, onShare, onOpen }) {
  if (typeof document === 'undefined') return onDownload?.();
  let resolveRef;
  const done = new Promise((resolve) => { resolveRef = resolve; });

  const container = el('div', { position: 'fixed', inset: '0', zIndex: '2147483647' });
  const overlay = el('div', {
    position: 'fixed',
    inset: '0',
    background: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  });
  const panel = el('div', {
    width: '100%',
    maxWidth: '380px',
    background: '#fff',
    color: '#0f172a',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(15,23,42,0.12)',
    padding: '20px',
    fontFamily: 'inherit',
  }, { role: 'dialog', 'aria-modal': 'true' });

  const icon = kind === 'video' ? 'play-circle' : kind === 'image' ? 'image' : 'download';
  panel.innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <span aria-hidden="true" style="display:inline-flex;width:48px;height:48px;align-items:center;justify-content:center;border-radius:12px;background:#dbeafe;color:#1d4ed8;margin-bottom:12px">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon === 'image' ? '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>' : icon === 'play-circle' ? '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>' : '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>'}</svg>
      </span>
      <h3 data-title style="margin:0 0 4px;font-size:17px;font-weight:700"></h3>
      <p data-name style="margin:0;font-size:13px;color:#64748b;word-break:break-all;line-height:1.4"></p>
    </div>
  `;
  panel.querySelector('[data-title]').textContent = title || i18n.t('fileDialog.title', 'Archivo listo');
  panel.querySelector('[data-name]').textContent = fileName;

  const cleanup = () => {
    try { document.removeEventListener('keydown', onKey); } catch {}
    try { document.body.removeChild(container); } catch {}
  };
  const run = async (fn) => {
    cleanup();
    await fn?.();
    resolveRef();
  };
  const cancel = () => {
    cleanup();
    resolveRef();
  };
  const onKey = (e) => { if (e.key === 'Escape') cancel(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) cancel(); });

  const btn = (primary, label, desc, handler) => {
    const b = el('button', {
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      gap: '12px',
      padding: '14px',
      border: primary ? '0' : '1px solid #dbe3ef',
      borderRadius: '12px',
      background: primary ? '#1d4ed8' : '#fff',
      color: primary ? '#fff' : '#0f172a',
      textAlign: 'left',
      font: 'inherit',
      cursor: 'pointer',
      marginTop: '8px',
    }, { type: 'button' });
    b.innerHTML = `<strong style="display:block;font-size:14px">${label}</strong><span style="display:block;font-size:12px;opacity:.75">${desc}</span>`;
    b.addEventListener('click', () => run(handler));
    return b;
  };

  panel.appendChild(btn(true, i18n.t('pdfDialog.download', 'Descargar'), i18n.t('pdfDialog.downloadDesc', 'Guardar en tu dispositivo'), onDownload));
  if (onShare && canNativeShare()) {
    panel.appendChild(btn(false, i18n.t('pdfDialog.share', 'Descargar y compartir'), i18n.t('pdfDialog.shareDesc', 'Guardar y abrir opciones para enviar'), onShare));
  }
  const cancelBtn = el('button', {
    width: '100%',
    border: '0',
    background: 'transparent',
    color: '#64748b',
    padding: '12px',
    marginTop: '4px',
    font: 'inherit',
    cursor: 'pointer',
  }, { type: 'button' }, i18n.t('pdfDialog.cancel', 'Cancelar'));
  cancelBtn.addEventListener('click', cancel);
  panel.appendChild(cancelBtn);

  if (window.matchMedia('(max-width: 600px)').matches) {
    overlay.style.alignItems = 'flex-end';
    overlay.style.padding = '0';
    panel.style.maxWidth = '100%';
    panel.style.borderRadius = '16px 16px 0 0';
  }

  overlay.appendChild(panel);
  container.appendChild(overlay);
  document.body.appendChild(container);
  onOpen?.();
  return done;
}
