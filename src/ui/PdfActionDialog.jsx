import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const pop = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme?.colors?.overlay || 'rgba(15, 23, 42, 0.55)'};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
  padding: 16px;
  pointer-events: auto;
  animation: ${fadeIn} 150ms ease-out;
  @media (max-width: 600px) {
    align-items: flex-end;
    padding: 0;
  }
`;

const Panel = styled.div`
  background: ${({ theme }) => theme?.colors?.surface || '#ffffff'};
  color: ${({ theme }) => theme?.colors?.text || '#0f172a'};
  border: 1px solid ${({ theme }) => theme?.colors?.border || '#e2e8f0'};
  border-radius: ${({ theme }) => theme?.radius?.lg || 16}px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12);
  overflow: hidden;
  animation: ${pop} 180ms cubic-bezier(0.2, 0, 0, 1);
  @media (max-width: 600px) {
    max-width: 100%;
    border-radius: 16px 16px 0 0;
  }
`;

const Header = styled.div`
  padding: 20px 20px 0;
  text-align: center;
`;

const IconWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ theme }) => theme?.colors?.primarySoft || '#dbeafe'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
`;

const iconColor = '#1d4ed8';

const Heading = styled.h3`
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 600;
  color: ${({ theme }) => theme?.colors?.text || '#0f172a'};
`;

const Filename = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme?.colors?.textMuted || '#64748b'};
  word-break: break-all;
  line-height: 1.4;
`;

const Actions = styled.div`
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid ${({ $primary }) => $primary ? 'transparent' : '#e2e8f0'};
  background: ${({ $primary }) => $primary ? '#1d4ed8' : '#ffffff'};
  color: ${({ $primary }) => $primary ? '#ffffff' : '#0f172a'};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.05s ease, background-color 0.15s ease, border-color 0.15s ease;
  text-align: left;
  &:hover:not(:disabled) {
    ${({ $primary }) => $primary
      ? 'background: #1e40af;'
      : 'background: #f1f5f9; border-color: #cbd5e1;'}
  }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.20); }
`;

const ActionIcon = styled.span`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  background: ${({ $primary }) => $primary ? 'rgba(255,255,255,0.15)' : '#dbeafe'};
  color: ${({ $primary }) => $primary ? '#ffffff' : '#1d4ed8'};
`;

const ActionLabel = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const ActionTitle = styled.span`
  line-height: 1.3;
`;

const ActionDesc = styled.span`
  font-size: 12px;
  font-weight: 400;
  opacity: 0.7;
  line-height: 1.3;
`;

const CancelBtn = styled.button`
  display: block;
  width: 100%;
  padding: 10px;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border-radius: 8px;
  margin-top: 4px;
  transition: color 0.15s ease, background-color 0.15s ease;
  &:hover { color: #0f172a; background: #f1f5f9; }
  &:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.20); }
`;

const canShare = typeof navigator !== 'undefined' &&
  typeof navigator.share === 'function' &&
  typeof navigator.canShare === 'function';

export default function PdfActionDialog({ open, fileName, onDownload, onShare, onCancel, loading }) {
  const { t } = useTranslation();
  if (!open) return null;

  return createPortal(
    <Overlay
      data-theme-aware="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget && onCancel) onCancel(); }}
    >
      <Panel role="dialog" aria-modal="true" aria-label="PDF options">
        <Header>
          <IconWrap>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </IconWrap>
          <Heading>{t('pdfDialog.title', 'PDF generado')}</Heading>
          <Filename>{fileName}</Filename>
        </Header>
        <Actions>
          <ActionBtn $primary onClick={onDownload} disabled={loading} autoFocus>
            <ActionIcon $primary>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </ActionIcon>
            <ActionLabel>
              <ActionTitle>{t('pdfDialog.download', 'Descargar')}</ActionTitle>
              <ActionDesc>{t('pdfDialog.downloadDesc', 'Guardar en tu dispositivo')}</ActionDesc>
            </ActionLabel>
          </ActionBtn>
          {canShare && (
            <ActionBtn onClick={onShare} disabled={loading}>
              <ActionIcon>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </ActionIcon>
              <ActionLabel>
                <ActionTitle>{t('pdfDialog.share', 'Descargar y compartir')}</ActionTitle>
                <ActionDesc>{t('pdfDialog.shareDesc', 'Guardar y abrir opciones para enviar')}</ActionDesc>
              </ActionLabel>
            </ActionBtn>
          )}
          <CancelBtn onClick={onCancel}>{t('pdfDialog.cancel', 'Cancelar')}</CancelBtn>
        </Actions>
      </Panel>
    </Overlay>,
    document.body
  );
}

// --- showPdfActions: DOM-based dialog (no React dependency) ---

function injectAnimations() {
  if (document.getElementById('xp-pdf-anim')) return;
  const style = document.createElement('style');
  style.id = 'xp-pdf-anim';
  style.textContent = `
    @keyframes xp-fadein { from { opacity: 0; } to { opacity: 1; } }
    @keyframes xp-pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  `;
  document.head.appendChild(style);
}

function createSvg(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

const svgPaths = {
  pdf: [
    { tag: 'path', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
    { tag: 'polyline', points: '14 2 14 8 20 8' },
    { tag: 'line', x1: '16', y1: '13', x2: '8', y2: '13' },
    { tag: 'line', x1: '16', y1: '17', x2: '8', y2: '17' },
    { tag: 'polyline', points: '10 9 9 9 8 9' },
  ],
  download: [
    { tag: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' },
    { tag: 'polyline', points: '7 10 12 15 17 10' },
    { tag: 'line', x1: '12', y1: '15', x2: '12', y2: '3' },
  ],
  share: [
    { tag: 'circle', cx: '18', cy: '5', r: '3' },
    { tag: 'circle', cx: '6', cy: '12', r: '3' },
    { tag: 'circle', cx: '18', cy: '19', r: '3' },
    { tag: 'line', x1: '8.59', y1: '13.51', x2: '15.42', y2: '17.49' },
    { tag: 'line', x1: '15.41', y1: '6.51', x2: '8.59', y2: '10.49' },
  ],
};

function buildSvgIcon(name, size = 20) {
  const svg = createSvg('svg', {
    width: String(size), height: String(size),
    viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '2',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  });
  for (const item of svgPaths[name]) {
    const el = createSvg(item.tag, item);
    svg.appendChild(el);
  }
  return svg;
}

function el(tag, style, attrs, ...children) {
  const element = document.createElement(tag);
  if (style) Object.assign(element.style, style);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') element.className = v;
      else element.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child instanceof Node) element.appendChild(child);
  }
  return element;
}

function createActionBtn(primary, label, desc, iconName, onClick, autoFocus) {
  const s = {
    display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
    padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
    fontSize: '14px', fontWeight: '600', fontFamily: 'inherit',
    textAlign: 'left', border: primary ? '1px solid transparent' : '1px solid #e2e8f0',
    background: primary ? '#1d4ed8' : '#ffffff',
    color: primary ? '#ffffff' : '#0f172a',
    transition: 'transform 0.05s ease, background-color 0.15s ease, border-color 0.15s ease',
  };
  const btn = el('button', s, { type: 'button', ...(autoFocus ? { autofocus: '' } : {}) });
  btn.addEventListener('click', onClick);
  btn.addEventListener('mouseenter', () => {
    btn.style.background = primary ? '#1e40af' : '#f1f5f9';
    if (!primary) btn.style.borderColor = '#cbd5e1';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = primary ? '#1d4ed8' : '#ffffff';
    if (!primary) btn.style.borderColor = '#e2e8f0';
  });

  const iconStyle = {
    width: '36px', height: '36px', borderRadius: '8px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
    background: primary ? 'rgba(255,255,255,0.15)' : '#dbeafe',
  };
  const iconWrap = el('span', iconStyle);
  const svgIcon = buildSvgIcon(iconName);
  svgIcon.style.color = primary ? '#fff' : '#1d4ed8';
  iconWrap.appendChild(svgIcon);

  const labelStyle = { display: 'flex', flexDirection: 'column', gap: '1px' };
  const labelWrap = el('span', labelStyle);
  labelWrap.appendChild(el('span', { lineHeight: '1.3' }, {}, label));
  labelWrap.appendChild(el('span', {
    fontSize: '12px', fontWeight: '400', opacity: '0.7', lineHeight: '1.3',
  }, {}, desc));

  btn.appendChild(iconWrap);
  btn.appendChild(labelWrap);
  return btn;
}

export function showPdfActions(blob, fileName) {
  injectAnimations();
  const fullFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const canShare = typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  const container = el('div', {
    position: 'fixed', inset: '0', zIndex: '2147483647',
  });
  document.body.appendChild(container);

  let resolved = false;
  let resolveRef;
  const p = new Promise((resolve) => { resolveRef = resolve; });

  const resolveOnce = (val) => {
    if (resolved) return;
    resolved = true;
    cleanup();
    resolveRef(val);
  };

  const cleanup = () => {
    document.removeEventListener('keydown', onKey);
    container.style.opacity = '0';
    container.style.transition = 'opacity 150ms ease-out';
    setTimeout(() => {
      try { document.body.removeChild(container); } catch {}
    }, 200);
  };

  const onKey = (e) => { if (e.key === 'Escape') cancel(); };
  document.addEventListener('keydown', onKey);

  const downloadOnly = async () => {
    await downloadBlob(blob, fullFileName);
    resolveOnce('download');
  };

  const downloadAndShare = async () => {
    await downloadBlob(blob, fullFileName);
    try {
      const file = new File([blob], fullFileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fullFileName });
      }
    } catch (shareErr) {
      if (shareErr.name !== 'AbortError') {
        console.warn('[showPdfActions:share]', shareErr);
      }
    }
    resolveOnce('share');
  };

  const cancel = () => resolveOnce('cancel');

  const overlay = el('div', {
    position: 'fixed', inset: '0',
    background: 'rgba(15, 23, 42, 0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px', animation: 'xp-fadein 150ms ease-out',
  });
  overlay.addEventListener('mousedown', (e) => { if (e.target === e.currentTarget) cancel(); });

  const mq = window.matchMedia('(max-width: 600px)');

  const panelStyle = {
    background: '#fff', color: '#0f172a', borderRadius: '16px',
    width: '100%', maxWidth: '380px',
    boxShadow: '0 20px 25px -5px rgba(15,23,42,0.12)',
    overflow: 'hidden', animation: 'xp-pop 180ms cubic-bezier(0.2,0,0,1)',
  };

  const panel = el('div', panelStyle, {
    role: 'dialog', 'aria-modal': 'true', 'aria-label': 'PDF options',
  });

  const headerStyle = { padding: '20px 20px 0', textAlign: 'center' };
  const header = el('div', headerStyle);

  const iconStyle = {
    width: '48px', height: '48px', borderRadius: '12px',
    background: '#dbeafe', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
  };
  const icon = el('span', iconStyle);
  icon.appendChild(buildSvgIcon('pdf', 24));

  header.appendChild(icon);
  header.appendChild(el('h3', {
    margin: '0 0 4px', fontSize: '17px', fontWeight: '600', color: '#0f172a',
  }, {}, i18n.t('pdfDialog.title', 'PDF generado')));
  header.appendChild(el('p', {
    margin: '0', fontSize: '13px', color: '#64748b',
    wordBreak: 'break-all', lineHeight: '1.4',
  }, {}, fullFileName));

  const actions = el('div', { padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '8px' });
  actions.appendChild(createActionBtn(true, i18n.t('pdfDialog.download', 'Descargar'), i18n.t('pdfDialog.downloadDesc', 'Guardar en tu dispositivo'), 'download', downloadOnly, true));
  if (canShare) {
    actions.appendChild(createActionBtn(false, i18n.t('pdfDialog.share', 'Descargar y compartir'), i18n.t('pdfDialog.shareDesc', 'Guardar y abrir opciones para enviar'), 'share', downloadAndShare, false));
  }

  const cancelBtn = el('button', {
    display: 'block', width: '100%', padding: '10px', border: '0',
    background: 'transparent', color: '#64748b', fontSize: '13px',
    fontWeight: '500', fontFamily: 'inherit', cursor: 'pointer',
    borderRadius: '8px', marginTop: '4px',
    transition: 'color 0.15s ease, background-color 0.15s ease',
  }, { type: 'button' }, i18n.t('pdfDialog.cancel', 'Cancelar'));
  cancelBtn.addEventListener('click', cancel);
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.color = '#0f172a';
    cancelBtn.style.background = '#f1f5f9';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.color = '#64748b';
    cancelBtn.style.background = 'transparent';
  });

  actions.appendChild(cancelBtn);

  const applyMobile = (isMobile) => {
    if (isMobile) {
      overlay.style.alignItems = 'flex-end';
      overlay.style.padding = '0';
      panel.style.maxWidth = '100%';
      panel.style.borderRadius = '16px 16px 0 0';
    } else {
      overlay.style.alignItems = 'center';
      overlay.style.padding = '16px';
      panel.style.maxWidth = '380px';
      panel.style.borderRadius = '16px';
    }
  };

  applyMobile(mq.matches);
  mq.addEventListener('change', (e) => applyMobile(e.matches));

  panel.appendChild(header);
  panel.appendChild(actions);
  overlay.appendChild(panel);
  container.appendChild(overlay);

  return p;
}

async function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch {}
    try { URL.revokeObjectURL(url); } catch {}
  }, 1500);
}
