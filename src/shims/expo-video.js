/**
 * Shim de expo-video usando HTML5 <video>.
 *
 * Soporta el subset de la API que usa el código RN portado:
 *  - useVideoPlayer(source, setup) → player con play/pause/replace/release y
 *    setters reactivos para loop/muted/volume.
 *  - VideoView({ player, contentFit, nativeControls, ... }) → render del <video>.
 */
import React, { useEffect, useRef, useState } from 'react';

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
  // Player como objeto estable durante toda la vida del componente.
  const ref = useRef(null);
  if (!ref.current) {
    const player = {
      _el: null,
      _source: source || null,
      get source() { return this._source; },
      set source(s) {
        this._source = s;
        if (this._el) {
          this._el.src = typeof s === 'string' ? s : s?.uri || '';
        }
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
      },
      release() { try { this._el?.pause?.(); } catch {} },
      seekBy() {},
    };
    if (typeof setup === 'function') {
      try { setup(player); } catch {}
    }
    ref.current = player;
  }
  return ref.current;
}

export function VideoView({
  player,
  style,
  contentFit = 'contain',
  nativeControls = true,
  allowsFullscreen = true,
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
      crossOrigin="anonymous"
      style={{ width: '100%', height: '100%', objectFit: contentFit, background: '#000', ...style }}
      {...rest}
    />
  );
}

export default { useVideoPlayer, VideoView };
