/** Shim de expo-video usando HTML5 <video>. */
import React, { useEffect, useRef } from 'react';

export function useVideoPlayer(source, setup) {
  const player = {
    source: source || null,
    loop: false,
    muted: false,
    volume: 1,
    playing: false,
    play() { this._el?.play?.(); this.playing = true; },
    pause() { this._el?.pause?.(); this.playing = false; },
    replace(s) { this.source = s; if (this._el) { this._el.src = typeof s === 'string' ? s : s?.uri || ''; } },
    release() { this._el?.pause?.(); },
    _el: null,
  };
  if (typeof setup === 'function') {
    try { setup(player); } catch { /* ignore */ }
  }
  return player;
}

export function VideoView({ player, style, contentFit = 'contain', nativeControls = true, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    if (player) player._el = ref.current;
    return () => { if (player) player._el = null; };
  }, [player]);
  const src = typeof player?.source === 'string' ? player.source : (player?.source?.uri || '');
  return (
    <video
      ref={ref}
      src={src}
      controls={nativeControls}
      style={{ width: '100%', height: '100%', objectFit: contentFit, ...style }}
      {...rest}
    />
  );
}

export default { useVideoPlayer, VideoView };
