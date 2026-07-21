/**
 * Shim de expo-video usando HTML5 <video>.
 *
 * Soporta el subset de la API que usa el código RN portado:
 *  - useVideoPlayer(source, setup) → player con play/pause/replace/release y
 *    setters reactivos para loop/muted/volume.
 *  - VideoView({ player, contentFit, nativeControls, ... }) → render del <video>.
 */
import React, { useEffect, useRef, useState } from 'react';
import { isNative, platform } from '@/platform/capacitor';

function applyToEl(player) {
  const el = player._el;
  if (!el) return;
  try {
    el.loop = !!player.loop;
    el.muted = !!player.muted;
    if (typeof player.volume === 'number') el.volume = Math.max(0, Math.min(1, player.volume));
  } catch {}
}

export function useVideoPlayer(source, setup) {
  // Forzamos un re-render cuando cambia el source para que VideoView lea el
  // valor nuevo. expo-video en RN reacciona a cambios del source argument;
  // este shim replica ese comportamiento.
  const [, force] = useState(0);
  const ref = useRef(null);
  if (!ref.current) {
    const player = {
      _el: null,
      _source: source || null,
      _onSourceChange: null,
      get source() { return this._source; },
      set source(s) {
        this._source = s;
        if (this._el) {
          this._el.src = typeof s === 'string' ? s : s?.uri || '';
        }
        this._onSourceChange?.();
      },
      _loop: false,
      get loop() { return this._loop; },
      set loop(v) { this._loop = !!v; if (this._el) this._el.loop = !!v; },

      _muted: false,
      get muted() { return this._muted; },
      set muted(v) { this._muted = !!v; if (this._el) this._el.muted = !!v; },

      _volume: 1,
      get volume() { return this._volume; },
      set volume(v) {
        const nv = Math.max(0, Math.min(1, Number(v) || 0));
        this._volume = nv;
        if (this._el) this._el.volume = nv;
      },

      playing: false,
      play() {
        if (this._el) {
          const p = this._el.play?.();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        }
        this.playing = true;
      },
      pause() { this._el?.pause?.(); this.playing = false; },
      replace(s) {
        this._source = s;
        if (this._el) {
          this._el.src = typeof s === 'string' ? s : s?.uri || '';
          this._el.load?.();
        }
        this._onSourceChange?.();
      },
      release() { try { this._el?.pause?.(); } catch {} },
      seekBy() {},
    };
    player._onSourceChange = () => force((x) => x + 1);
    if (typeof setup === 'function') {
      try { setup(player); } catch {}
    }
    ref.current = player;
  }
  // Reactivo al source: si llega un valor nuevo, actualizamos el player y
  // re-ejecutamos el callback de setup (igual que hace expo-video nativo).
  const player = ref.current;
  const newKey = typeof source === 'string' ? source : source?.uri || null;
  const oldKey = typeof player._source === 'string' ? player._source : player._source?.uri || null;
  if (newKey !== oldKey) {
    player._source = source || null;
    if (player._el) {
      player._el.src = newKey || '';
      try { player._el.load?.(); } catch {}
    }
    if (typeof setup === 'function') {
      try { setup(player); } catch {}
    }
  }
  return player;
}

export function VideoView({
  player,
  style,
  contentFit = 'contain',
  nativeControls = true,
  allowsFullscreen = true,
  // Props específicas de RN/expo-video que NO existen en el DOM <video>;
  // las desestructuramos para que NO acaben en el spread y eviten warnings
  // del estilo "Unknown DOM property fullscreenOptions".
  allowsPictureInPicture,
  fullscreenOptions,
  showsTimecodes,
  requiresLinearPlayback,
  startsPictureInPictureAutomatically,
  ...rest
}) {
  const elRef = useRef(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!player) return undefined;
    player._el = elRef.current;
    applyToEl(player);
    if (player.playing) {
      const p = elRef.current?.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
    force((x) => x + 1);
    return () => { if (player) player._el = null; };
  }, [player]);

  const src = typeof player?._source === 'string'
    ? player._source
    : (player?._source?.uri || '');

  return (
    <video
      ref={elRef}
      src={src}
      controls={nativeControls}
      playsInline
      crossOrigin={isNative && platform === 'ios' ? undefined : 'anonymous'}
      style={{ width: '100%', height: '100%', objectFit: contentFit, background: '#000', ...style }}
      {...rest}
    />
  );
}

export default { useVideoPlayer, VideoView };
