/**
 * Shim de expo-image-picker para web.
 * Usa <input type="file"> oculto y devuelve la API que usa el source RN.
 *
 * Soporta allowsEditing con un recortador cuadrado integrado (zoom + arrastre).
 * La imagen siempre cubre al menos el viewport (modo "cover").
 */
import i18n from '@/i18n';

export const MediaTypeOptions = { Images: 'Images', Videos: 'Videos', All: 'All' };
export const MediaType = { Images: 'Images', Videos: 'Videos' };

export async function requestMediaLibraryPermissionsAsync() {
  return { granted: true, status: 'granted' };
}
export async function requestCameraPermissionsAsync() {
  return { granted: true, status: 'granted' };
}
export async function getMediaLibraryPermissionsAsync() {
  return { granted: true, status: 'granted' };
}

function t(key, fallback) {
  return i18n.t ? i18n.t(key, { defaultValue: fallback }) : fallback;
}

// ─── Editor de imagen con zoom/arrastre para allowsEditing ───
function showCropEditor(file, aspect) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onload = () => startCrop(img, dataUrl, file, aspect, resolve);
      img.onerror = () => resolve({ canceled: true, assets: null });
      img.src = dataUrl;
    };
    reader.onerror = () => resolve({ canceled: true, assets: null });
    reader.readAsDataURL(file);
  });
}

function startCrop(img, dataUrl, file, aspect, resolve) {
  let zoom, dx, dy;
  let vpSize = 0;
  let dragging = false, dragStartX = 0, dragStartY = 0, dragDx = 0, dragDy = 0;

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: '2147484000', padding: '16px',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    background: '#fff', borderRadius: '12px', width: '100%',
    maxWidth: '520px', overflow: 'hidden', display: 'flex',
    flexDirection: 'column', maxHeight: 'calc(100vh - 32px)', color: '#000',
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #e0e0e0',
    fontSize: '17px', fontWeight: '600',
  });
  header.textContent = t('team.adjustImage', 'Ajustar imagen');

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  Object.assign(closeBtn.style, {
    background: 'transparent', border: '0', fontSize: '22px',
    cursor: 'pointer', width: '32px', height: '32px',
    borderRadius: '6px', color: '#666',
  });
  closeBtn.onmouseover = () => { closeBtn.style.background = '#f0f0f0'; };
  closeBtn.onmouseout = () => { closeBtn.style.background = 'transparent'; };
  closeBtn.onclick = () => {
    cleanupEvents();
    document.body.removeChild(overlay);
    resolve({ canceled: true, assets: null });
  };
  header.appendChild(closeBtn);

  const viewport = document.createElement('div');
  Object.assign(viewport.style, {
    position: 'relative', width: '100%', aspectRatio: '1',
    background: '#1a1a1a', overflow: 'hidden', cursor: 'grab',
  });

  const imageEl = document.createElement('img');
  imageEl.src = dataUrl;
  Object.assign(imageEl.style, {
    position: 'absolute', maxWidth: 'none', pointerEvents: 'none',
    transformOrigin: '0 0',
  });
  viewport.appendChild(imageEl);

  const shadow = document.createElement('div');
  Object.assign(shadow.style, {
    position: 'absolute', inset: '0',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
    pointerEvents: 'none',
  });
  viewport.appendChild(shadow);

  const canvasPreview = document.createElement('canvas');
  Object.assign(canvasPreview.style, {
    width: '72px', height: '72px', borderRadius: '8px',
    border: '2px solid #e0e0e0', background: '#fff', flexShrink: '0',
  });
  canvasPreview.width = 512;
  canvasPreview.height = 512;

  // ─── Core math ───

  function renderView() {
    if (!vpSize) return;
    const dispW = img.naturalWidth * zoom;
    const dispH = img.naturalHeight * zoom;
    imageEl.style.width = dispW + 'px';
    imageEl.style.height = dispH + 'px';
    imageEl.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function renderPreview() {
    if (!vpSize) return;
    const scale = 512 / vpSize;
    const dispW = img.naturalWidth * zoom;
    const dispH = img.naturalHeight * zoom;
    const ctx = canvasPreview.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(img, dx * scale, dy * scale, dispW * scale, dispH * scale);
  }

  function layout() {
    renderView();
    renderPreview();
  }

  function initCrop() {
    const vp = viewport.offsetWidth;
    if (!vp) return;
    vpSize = vp;
    const fitZ = Math.min(vp / img.naturalWidth, vp / img.naturalHeight);
    zoom = Math.min(fitZ, 1);
    slider.min = '0.1';
    slider.value = zoom;
    const dispW = img.naturalWidth * zoom;
    const dispH = img.naturalHeight * zoom;
    dx = (vpSize - dispW) / 2;
    dy = (vpSize - dispH) / 2;
    layout();
  }

  // ─── Drag ───

  function onMouseDown(e) {
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragDx = dx;
    dragDy = dy;
    viewport.style.cursor = 'grabbing';
  }
  function onMouseMove(e) {
    if (!dragging) return;
    dx = dragDx + (e.clientX - dragStartX);
    dy = dragDy + (e.clientY - dragStartY);
    layout();
  }
  function onMouseUp() {
    dragging = false;
    viewport.style.cursor = 'grab';
  }
  viewport.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // ─── Wheel zoom ───

  function onWheel(e) {
    e.preventDefault();
    if (!vpSize) return;
    const rect = viewport.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZ = zoom;
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    const newZ = Math.max(0.1, Math.min(10, oldZ + delta));
    if (newZ === oldZ) return;
    dx = mx + (dx - mx) * newZ / oldZ;
    dy = my + (dy - my) * newZ / oldZ;
    zoom = newZ;
    slider.value = zoom;
    layout();
  }
  viewport.addEventListener('wheel', onWheel, { passive: false });

  const cleanupEvents = () => {
    viewport.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    viewport.removeEventListener('wheel', onWheel);
  };

  // ─── Controls ───

  const controls = document.createElement('div');
  Object.assign(controls.style, {
    padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px',
  });

  const sliderRow = document.createElement('div');
  Object.assign(sliderRow.style, {
    display: 'flex', alignItems: 'center', gap: '10px',
  });

  const minus = document.createElement('span');
  minus.textContent = '−';
  minus.style.cssText = 'font-size:12px;color:#888;';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0.1';
  slider.max = '5';
  slider.step = '0.01';
  slider.value = '1';
  Object.assign(slider.style, { flex: '1', accentColor: '#0066ff' });
  slider.oninput = () => {
    if (!vpSize) return;
    const newZ = parseFloat(slider.value);
    const ratio = newZ / zoom;
    const cx = vpSize / 2;
    const cy = vpSize / 2;
    dx = cx + (dx - cx) * ratio;
    dy = cy + (dy - cy) * ratio;
    zoom = newZ;
    layout();
  };

  const plus = document.createElement('span');
  plus.textContent = '+';
  plus.style.cssText = 'font-size:12px;color:#888;';

  const zoomPct = document.createElement('span');
  Object.assign(zoomPct.style, { fontSize: '12px', color: '#888', minWidth: '36px', textAlign: 'center' });

  sliderRow.append(minus, slider, plus, zoomPct);

  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
  });

  const resetBtn = document.createElement('button');
  resetBtn.textContent = t('team.resetView', 'Restablecer');
  Object.assign(resetBtn.style, {
    background: 'transparent', border: '0', color: '#0066ff', fontSize: '14px',
    cursor: 'pointer', padding: '8px 12px', borderRadius: '8px',
    fontWeight: '500',
  });
  resetBtn.onmouseover = () => { resetBtn.style.background = '#f0f4ff'; };
  resetBtn.onmouseout = () => { resetBtn.style.background = 'transparent'; };
  resetBtn.onclick = () => {
    const fitZ = Math.min(vpSize / img.naturalWidth, vpSize / img.naturalHeight);
    zoom = Math.min(fitZ, 1);
    slider.value = zoom;
    const dispW = img.naturalWidth * zoom;
    const dispH = img.naturalHeight * zoom;
    dx = (vpSize - dispW) / 2;
    dy = (vpSize - dispH) / 2;
    layout();
  };

  btnRow.append(resetBtn, canvasPreview);
  controls.append(sliderRow, btnRow);

  // ─── Footer ───

  const footer = document.createElement('div');
  Object.assign(footer.style, {
    display: 'flex', justifyContent: 'flex-end', gap: '8px',
    padding: '14px 20px', borderTop: '1px solid #e0e0e0',
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = t('common.cancel', 'Cancelar');
  Object.assign(cancelBtn.style, {
    padding: '10px 16px', borderRadius: '8px', border: '1px solid #d0d0d0',
    background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    color: '#333',
  });
  cancelBtn.onmouseover = () => { cancelBtn.style.background = '#f5f5f5'; };
  cancelBtn.onmouseout = () => { cancelBtn.style.background = '#fff'; };
  cancelBtn.onclick = () => {
    cleanupEvents();
    document.body.removeChild(overlay);
    resolve({ canceled: true, assets: null });
  };

  const applyBtn = document.createElement('button');
  applyBtn.textContent = t('common.apply', 'Aplicar');
  Object.assign(applyBtn.style, {
    padding: '10px 16px', borderRadius: '8px', border: '0',
    background: '#0066ff', color: '#fff', cursor: 'pointer',
    fontSize: '14px', fontWeight: '600',
  });
  applyBtn.onmouseover = () => { applyBtn.style.background = '#0052cc'; };
  applyBtn.onmouseout = () => { applyBtn.style.background = '#0066ff'; };
  applyBtn.onclick = () => {
    if (!vpSize) vpSize = viewport.offsetWidth || 520;
    const scale = 512 / vpSize;
    const dispW = img.naturalWidth * zoom;
    const dispH = img.naturalHeight * zoom;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 512;
    outCanvas.height = 512;
    const ctx = outCanvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(img, dx * scale, dy * scale, dispW * scale, dispH * scale);
    const fullUri = outCanvas.toDataURL('image/jpeg', 0.85);
    const b64 = fullUri.split(',')[1];

    const asset = {
      uri: fullUri,
      width: 512,
      height: 512,
      type: 'image',
      fileName: file.name,
      fileSize: b64.length * 0.75,
      mimeType: 'image/jpeg',
      base64: b64,
      file,
    };
    cleanupEvents();
    document.body.removeChild(overlay);
    resolve({ canceled: false, assets: [asset] });
  };

  footer.append(cancelBtn, applyBtn);
  panel.append(header, viewport, controls, footer);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const previewInterval = setInterval(() => {
    if (!document.body.contains(overlay)) {
      clearInterval(previewInterval);
      return;
    }
    zoomPct.textContent = Math.round(zoom * 100) + '%';
  }, 150);

  requestAnimationFrame(() => initCrop());
}

// ─── File picker interno ───
function pickFile({ accept = 'image/*', capture = null, base64 = false, allowsEditing = false, aspect = null } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.capture = capture;
    input.style.display = 'none';
    document.body.appendChild(input);

    let resolved = false;
    const cleanup = () => {
      try { document.body.removeChild(input); } catch (_) { /* noop */ }
    };

    input.onchange = async () => {
      const file = input.files && input.files[0];
      cleanup();
      if (!file) {
        resolved = true;
        return resolve({ canceled: true, assets: null });
      }

      if (allowsEditing) {
        const cropResult = await showCropEditor(file, aspect);
        resolved = true;
        return resolve(cropResult);
      }

      const uri = URL.createObjectURL(file);
      const asset = {
        uri,
        width: 0,
        height: 0,
        type: file.type.startsWith('video') ? 'video' : 'image',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        file,
      };
      if (base64) {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result || '').split(',')[1] || '');
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        asset.base64 = b64;
      }
      resolved = true;
      resolve({ canceled: false, assets: [asset] });
    };

    if (!allowsEditing) {
      const onFocus = () => {
        window.removeEventListener('focus', onFocus);
        setTimeout(() => {
          if (!resolved) {
            cleanup();
            resolved = true;
            resolve({ canceled: true, assets: null });
          }
        }, 500);
      };
      window.addEventListener('focus', onFocus);
    }

    input.click();
  });
}

export async function launchImageLibraryAsync(options = {}) {
  const mediaTypes = options.mediaTypes;
  let accept = 'image/*';
  if (Array.isArray(mediaTypes)) {
    if (mediaTypes.includes('videos') || mediaTypes.includes('Videos')) accept = 'image/*,video/*';
  } else if (mediaTypes === MediaTypeOptions.Videos) {
    accept = 'video/*';
  } else if (mediaTypes === MediaTypeOptions.All) {
    accept = 'image/*,video/*';
  }
  return pickFile({
    accept,
    base64: !!options.base64,
    allowsEditing: !!options.allowsEditing,
    aspect: options.aspect,
  });
}

export async function launchCameraAsync(options = {}) {
  return pickFile({ accept: 'image/*', capture: 'environment', base64: !!options.base64 });
}

export default {
  MediaTypeOptions, MediaType,
  requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync,
  getMediaLibraryPermissionsAsync,
  launchImageLibraryAsync, launchCameraAsync,
};