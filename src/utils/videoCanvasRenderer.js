import ballImgSrc from '@/images/ball.png';
import { ratioToDisplay } from '@/vendor/tacticalBoard/fields/fieldConfigs';
import { getPlayerRenderMetrics } from '@/utils/playerRenderMetrics';

const FONT_STACK = 'Arial, Helvetica, sans-serif';
let currentViewMode = 'entire';

const VIDEO_WIDTH = 1920;
const FIELD_BG = '#4a8c3f';
const NEUTRAL_PLAYER_COLORS = {
  background: '#0F766E',
  bib: '#FBBF24',
  letter: '#111827',
};

let ballImage = null;
if (typeof Image !== 'undefined') {
  ballImage = new Image();
  ballImage.src = ballImgSrc;
}

function ensureEven(n) {
  return n % 2 === 0 ? n : n + 1;
}

export function getVideoDimensions(aspectRatio) {
  return {
    width: ensureEven(VIDEO_WIDTH),
    height: ensureEven(Math.round(VIDEO_WIDTH / aspectRatio)),
  };
}

function getScale(cw, ch) {
  return Math.min(cw, ch) / 500;
}

function pos(elem, cw, ch) {
  const xr = elem.xRatio !== undefined ? elem.xRatio : elem.x !== undefined ? elem.x / 1280 : 0;
  const yr = elem.yRatio !== undefined ? elem.yRatio : elem.y !== undefined ? elem.y / 720 : 0;
  return ratioToDisplay(xr, yr, currentViewMode, cw, ch);
}

function applyRotation(ctx, x, y, rotation) {
  let rot = rotation || 0;
  if (rot) {
    ctx.translate(x, y);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(-x, -y);
  }
}

function drawJerseyPath(ctx, cx, cy, size) {
  const s = size / 100;
  ctx.beginPath();
  ctx.moveTo(cx - 15 * s, cy - 40 * s);
  ctx.quadraticCurveTo(cx, cy - 30 * s, cx + 15 * s, cy - 40 * s);
  ctx.lineTo(cx + 32 * s, cy - 30 * s);
  ctx.lineTo(cx + 45 * s, cy - 8 * s);
  ctx.lineTo(cx + 28 * s, cy + 4 * s);
  ctx.lineTo(cx + 20 * s, cy - 5 * s);
  ctx.lineTo(cx + 20 * s, cy + 40 * s);
  ctx.lineTo(cx - 20 * s, cy + 40 * s);
  ctx.lineTo(cx - 20 * s, cy - 5 * s);
  ctx.lineTo(cx - 28 * s, cy + 4 * s);
  ctx.lineTo(cx - 45 * s, cy - 8 * s);
  ctx.lineTo(cx - 32 * s, cy - 30 * s);
  ctx.closePath();
}

function drawJerseyBibPath(ctx, cx, cy, size) {
  const s = size / 100;
  ctx.beginPath();
  ctx.moveTo(cx - 12 * s, cy - 38 * s);
  ctx.quadraticCurveTo(cx, cy - 26 * s, cx + 12 * s, cy - 38 * s);
  ctx.lineTo(cx + 20 * s, cy - 34 * s);
  ctx.quadraticCurveTo(cx + 16 * s, cy - 18 * s, cx + 16 * s, cy - 2 * s);
  ctx.lineTo(cx + 16 * s, cy + 32 * s);
  ctx.lineTo(cx - 16 * s, cy + 32 * s);
  ctx.lineTo(cx - 16 * s, cy - 2 * s);
  ctx.quadraticCurveTo(cx - 16 * s, cy - 18 * s, cx - 20 * s, cy - 34 * s);
  ctx.closePath();
}

function drawKitPattern(ctx, cx, cy, size, pattern, color, isJersey) {
  const s = size / 100;
  ctx.fillStyle = color;
  if (pattern === 'vertical') {
    if (isJersey) {
      [-20, 0, 20].forEach((offset) => ctx.fillRect(cx + offset * s - 5 * s, cy - size / 2, 10 * s, size));
    } else {
      const r = size / 2;
      [-0.5, -0.1, 0.3].forEach((f) => ctx.fillRect(cx + size * f, cy - r, size * 0.15, size));
    }
  } else if (pattern === 'horizontal') {
    [-18, 0, 18].forEach((offset) => ctx.fillRect(cx - size / 2, cy + offset * s - 4 * s, size, 8 * s));
  } else if (pattern === 'halves') {
    ctx.fillRect(cx, cy - size / 2, size / 2, size);
  } else if (pattern === 'diagonal' || pattern === 'sash') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 4);
    const offsets = pattern === 'sash' ? [0] : [-28 * s, 0, 28 * s];
    offsets.forEach((offset) => ctx.fillRect(-size, offset - 7 * s, size * 2, 14 * s));
    ctx.restore();
  }
  if (isJersey) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 2.5 * s);
    ctx.beginPath();
    ctx.moveTo(cx - 32 * s, cy - 30 * s);
    ctx.lineTo(cx - 45 * s, cy - 8 * s);
    ctx.moveTo(cx + 32 * s, cy - 30 * s);
    ctx.lineTo(cx + 45 * s, cy - 8 * s);
    ctx.moveTo(cx - 10 * s, cy - 38 * s);
    ctx.lineTo(cx, cy - 28 * s);
    ctx.lineTo(cx + 10 * s, cy - 38 * s);
    ctx.stroke();
  }
}


function setLineDash(ctx, elem, scale) {
  if (elem.lineType === 'dotted') {
    const ds = (elem.dotSize || 2) * scale;
    const sp = (elem.dotSpacing || 4) * scale;
    ctx.setLineDash([ds, sp]);
  } else {
    ctx.setLineDash([]);
  }
}

function clamp01(value) {
  if (typeof value !== 'number') return 1;
  return Math.max(0, Math.min(1, value));
}

function pointAtProgress(from, to, progress) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

function quadraticPoint(from, control, to, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y,
  };
}

function sampleQuadratic(from, control, to, steps = 16) {
  const samples = [];
  for (let i = 1; i <= steps; i += 1) {
    samples.push(quadraticPoint(from, control, to, i / steps));
  }
  return samples;
}

function sampleCurve(points) {
  if (points.length <= 2) return points;
  const samples = [points[0]];
  if (points.length === 3) {
    samples.push(...sampleQuadratic(points[0], points[1], points[2], 32));
    return samples;
  }
  let current = points[0];
  for (let i = 1; i < points.length - 2; i += 1) {
    const end = {
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2,
    };
    samples.push(...sampleQuadratic(current, points[i], end));
    current = end;
  }
  samples.push(...sampleQuadratic(current, points[points.length - 2], points[points.length - 1]));
  return samples;
}

function partialPolyline(points, progress) {
  const p = clamp01(progress);
  if (p >= 1 || points.length < 2) return points;
  if (p <= 0) return [points[0], points[0]];

  let total = 0;
  const lengths = [];
  for (let i = 1; i < points.length; i += 1) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(length);
    total += length;
  }
  if (!total) return [points[0], points[0]];

  const target = total * p;
  let covered = 0;
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const length = lengths[i - 1];
    if (covered + length >= target) {
      out.push(pointAtProgress(points[i - 1], points[i], (target - covered) / length));
      return out;
    }
    out.push(points[i]);
    covered += length;
  }
  return out;
}

function strokePolyline(ctx, points, elem, scale) {
  if (!points.length) return;
  const thickness = (elem.baseThickness || elem.thickness || 1) * scale * 0.7;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = elem.color || '#000';
  ctx.lineWidth = Math.max(1, thickness);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  setLineDash(ctx, elem, scale);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPlayer(ctx, cw, ch, elem, scale, options = {}) {
  const p = pos(elem, cw, ch);
  const { size, radius: r, nameFontSize } = getPlayerRenderMetrics(elem, scale);
  const color = elem.color || '#2176ff';
  const numberColor = elem.numberColor || '#ffffff';
  const isNeutral =
    elem.isNeutral === true ||
    elem.id === 'neutral-player' ||
    elem.idBase === 'neutral-player' ||
    elem.number === 'N';
  const hasBib = elem.hasBib !== undefined ? elem.hasBib : isNeutral;
  const neutralBackgroundColor = elem.backgroundColor || NEUTRAL_PLAYER_COLORS.background;
  const shirtColor = isNeutral ? neutralBackgroundColor : color;
  const bibColor = elem.bibColor || (isNeutral ? color : (NEUTRAL_PLAYER_COLORS.bib || '#FBBF24'));

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  const showPhotos = elem.showPhotos ?? options.showPhotos;
  const photoKey = elem.photoUrl || elem.playerData?.foto;
  const photoImg =
    photoKey && (options.playerPhotos?.[photoKey] || options.playerPhotos?.[elem.playerData?.foto]);

  if (showPhotos && photoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photoImg, p.x - r, p.y - r, size, size);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    const isJersey = elem.shape === 'jersey';

    if (isJersey) {
      drawJerseyPath(ctx, p.x, p.y, size);
      ctx.fillStyle = shirtColor;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = shirtColor;
      ctx.fill();
    }

    const sColor = elem.kitSecondaryColor || (elem.isGoalkeeper
      ? (elem.goalkeeperStripeColor || '#ffffff')
      : (elem.stripeColor || ((color.toLowerCase().trim() === '#ffffff' || color.toLowerCase().trim() === '#fff' || color.toLowerCase().trim() === 'white') ? '#000000' : '#ffffff')));
    const kitPattern = elem.kitPattern || (elem.hasStripes || elem.isGoalkeeper ? 'vertical' : 'solid');
    const drawPattern =
      elem.hasStripes || kitPattern !== 'solid' || elem.isGoalkeeper || (isJersey && elem.kitSecondaryColor);

    if (drawPattern) {
      ctx.save();
      if (isJersey) {
        drawJerseyPath(ctx, p.x, p.y, size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      }
      ctx.clip();
      drawKitPattern(ctx, p.x, p.y, size, kitPattern, sColor, isJersey);
      ctx.restore();
    }

    // Draw the outline/stroke on top of the pattern
    if (isJersey) {
      drawJerseyPath(ctx, p.x, p.y, size);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (hasBib) {
      ctx.save();
      if (isJersey) {
        ctx.globalAlpha = 0.8;
        drawJerseyBibPath(ctx, p.x, p.y, size);
        ctx.fillStyle = bibColor;
        ctx.fill();
      ctx.strokeStyle = elem.kitSecondaryColor && !isJersey ? elem.kitSecondaryColor : '#222';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r - 0.5, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r - 0.5, 0, Math.PI * 2);
        ctx.fillStyle = bibColor;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = shirtColor;
        const cutouts = [
          [p.x, p.y - size * 0.56, size * 0.18],
          [p.x - size * 0.56, p.y, size * 0.2],
          [p.x + size * 0.56, p.y, size * 0.2],
        ];
        for (const cutout of cutouts) {
          ctx.beginPath();
          ctx.arc(cutout[0], cutout[1], cutout[2], 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        for (const cutout of cutouts) {
          ctx.beginPath();
          ctx.arc(cutout[0], cutout[1], cutout[2], 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r - 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    const displayText = elem.displayLabel !== undefined ? elem.displayLabel : isNeutral ? 'N' : elem.number;
    const showNumbers =
      elem.playersWithNumber !== undefined
        ? elem.playersWithNumber
        : options.playersWithNumber !== undefined
          ? options.playersWithNumber
          : true;
    if (displayText !== undefined && (showNumbers !== false || isNeutral)) {
      const isLabel = elem.displayLabel !== undefined;
      const baseFs = isLabel
        ? Math.max(10, size * 0.45)
        : String(displayText).length > 2
          ? size * 0.4
          : size * 0.6;
      const fs = isJersey ? Math.max(8, baseFs * 0.72) : baseFs;
      ctx.font = `${isLabel ? 600 : 'bold'} ${fs}px ${FONT_STACK}`;
      ctx.fillStyle = elem.numberColor || (isNeutral ? NEUTRAL_PLAYER_COLORS.letter : numberColor);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(displayText), p.x, isJersey || isNeutral ? p.y + size * 0.08 : p.y);
    }
  }

  ctx.restore();

  if (elem.playerData && (elem.playerData.nombre || elem.playerData.name)) {
    const name = elem.playerData.nombre || elem.playerData.name;
    const fs = nameFontSize;
    ctx.font = `${fs}px ${FONT_STACK}`;
    const tw = ctx.measureText(name).width;
    const pad = 1;
    const ny = p.y + r + fs / 2 + 1;
    const bg = elem.textBackgroundColor || '#fff';

    ctx.fillStyle = bg === 'transparent' ? 'rgba(255,255,255,0)' : bg;
    if (bg !== 'transparent') {
      ctx.fillRect(p.x - tw / 2 - pad, ny - fs / 2 - pad, tw + pad * 2, fs + pad * 2);
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 0.75;
      ctx.strokeRect(p.x - tw / 2 - pad, ny - fs / 2 - pad, tw + pad * 2, fs + pad * 2);
    }
    ctx.fillStyle = elem.textColor || '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, p.x, ny);
  }
}

function drawStaff(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const baseSize = elem.baseSize || 24;
  const size = baseSize * scale;
  const r = size / 2;
  const color = elem.color || '#333';
  const label = elem.displayLabel || 'CT';
  const fs = String(label).length > 2 ? size * 0.4 : size * 0.5;

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `bold ${fs}px ${FONT_STACK}`;
  ctx.fillStyle = elem.numberColor || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, p.x, p.y);

  ctx.restore();
}

function drawBall(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const baseSize = elem.baseSize || 18;
  const size = baseSize * scale;

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  if (ballImage && ballImage.complete && ballImage.naturalWidth !== 0) {
    const r = size / 2;
    ctx.drawImage(ballImage, p.x - r, p.y - r, size, size);
  } else {
    // Escribir el emoji ⚽ como texto en el canvas sin comillas en el font-family
    ctx.font = `${size * 0.95}px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dejamos que el navegador renderice el emoji nativo a color.
    ctx.fillText('⚽', p.x, p.y);
  }

  ctx.restore();
}

function drawBallShadow(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const baseSize = (elem.baseSize || elem.size || 18) * scale;
  const shadowScale = elem.shadowScale ?? 0.8;
  const opacity = elem.opacity ?? 0.35;
  const w = baseSize * 0.92 * shadowScale;
  const h = baseSize * 0.34 * shadowScale;

  ctx.save();
  ctx.translate(p.x + w * 0.1, p.y + h * 0.04);
  ctx.rotate((-8 * Math.PI) / 180);

  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.globalAlpha = opacity * 0.28;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 0, (w * 0.72) / 2, (h * 0.7) / 2, 0, 0, Math.PI * 2);
  ctx.globalAlpha = opacity * 0.55;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 0, (w * 0.42) / 2, (h * 0.48) / 2, 0, 0, Math.PI * 2);
  ctx.globalAlpha = opacity;
  ctx.fill();

  ctx.restore();
}

function drawCone(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const baseSize = elem.baseSize || elem.size || 24;
  const size = baseSize * scale;
  const color = elem.color || '#FF6B00';

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  const topY = p.y - size * 0.425;
  const botY = p.y + size * 0.425;
  const halfW = size * 0.5;
  ctx.beginPath();
  ctx.moveTo(p.x, topY);
  ctx.lineTo(p.x + halfW, botY);
  ctx.lineTo(p.x - halfW, botY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = '#222';
  const barH = size * 0.13;
  const barW = size * 0.6;
  const barY = botY - barH / 2 - 1;
  ctx.beginPath();
  ctx.roundRect(p.x - barW / 2, barY, barW, barH, barH / 2);
  ctx.fill();

  ctx.restore();
}

function drawConePro(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || elem.size || 24) * scale;
  const color = elem.color || '#FF6B00';
  const s = size / 50;

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  ctx.beginPath();
  ctx.moveTo(p.x - 15 * s, p.y + 20 * s);
  ctx.lineTo(p.x, p.y - 17 * s);
  ctx.lineTo(p.x + 15 * s, p.y + 20 * s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x - 10 * s, p.y + 13 * s);
  ctx.lineTo(p.x, p.y - 10 * s);
  ctx.lineTo(p.x + 10 * s, p.y + 13 * s);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * s;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(p.x - 7 * s, p.y + 10 * s);
  ctx.lineTo(p.x, p.y - 7 * s);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1 * s;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(p.x - 17 * s, p.y + 18 * s, 34 * s, 5 * s, s);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawConeFlat(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || elem.size || 18) * scale;
  const color = elem.color || '#FF6B00';
  const s = size / 40;

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  ctx.beginPath();
  ctx.moveTo(p.x - 18 * s, p.y + 4 * s);
  ctx.quadraticCurveTo(p.x, p.y + 12 * s, p.x + 18 * s, p.y + 4 * s);
  ctx.quadraticCurveTo(p.x, p.y - 4 * s, p.x - 18 * s, p.y + 4 * s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x - 12 * s, p.y + 2 * s);
  ctx.quadraticCurveTo(p.x, p.y - 2 * s, p.x + 12 * s, p.y + 2 * s);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  ctx.restore();
}

function drawRing(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || 24) * scale;
  const color = elem.color || '#FFD700';
  const sw = Math.max(2, size * 0.12);

  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = sw;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(p.x, p.y, size * 0.325, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawGoal(ctx, cw, ch, elem, scale) {
  drawGoalLarge(ctx, cw, ch, elem, scale);
}

function drawGoalLarge(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || 50) * scale;
  const s = size / 120;
  const ox = p.x,
    oy = p.y;

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  const getX = (xVal) => ox + (xVal - 60) * s;
  const getY = (yVal) => oy + (yVal - 35) * s;

  // Fondo translúcido de la red
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.beginPath();
  ctx.moveTo(getX(15), getY(32));
  ctx.lineTo(getX(22), getY(12));
  ctx.lineTo(getX(98), getY(12));
  ctx.lineTo(getX(105), getY(32));
  ctx.lineTo(getX(105), getY(38));
  ctx.lineTo(getX(98), getY(22));
  ctx.lineTo(getX(22), getY(22));
  ctx.lineTo(getX(15), getY(38));
  ctx.closePath();
  ctx.fill();

  // Patrón de red de diamantes
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();

  const getQuadNetPath = (p0, p1, p2, p3, uDivs = 8, vDivs = 6) => {
    const getPt = (u, v) => {
      const x = (1 - u) * ((1 - v) * p0.x + v * p3.x) + u * ((1 - v) * p1.x + v * p2.x);
      const y = (1 - u) * ((1 - v) * p0.y + v * p3.y) + u * ((1 - v) * p1.y + v * p2.y);
      return { x, y };
    };
    for (let i = 0; i < uDivs; i++) {
      for (let j = 0; j <= vDivs; j++) {
        const u1 = i / uDivs;
        const v1 = j / vDivs;
        if (j < vDivs) {
          const u2 = (i + 1) / uDivs;
          const v2 = (j + 1) / vDivs;
          const pt1 = getPt(u1, v1);
          const pt2 = getPt(u2, v2);
          ctx.moveTo(getX(pt1.x), getY(pt1.y));
          ctx.lineTo(getX(pt2.x), getY(pt2.y));
        }
        if (j > 0) {
          const u2 = (i + 1) / uDivs;
          const v2 = (j - 1) / vDivs;
          const pt1 = getPt(u1, v1);
          const pt2 = getPt(u2, v2);
          ctx.moveTo(getX(pt1.x), getY(pt1.y));
          ctx.lineTo(getX(pt2.x), getY(pt2.y));
        }
      }
    }
  };

  // Panels for Large Goal
  getQuadNetPath({ x: 15, y: 32 }, { x: 105, y: 32 }, { x: 98, y: 12 }, { x: 22, y: 12 }, 10, 4);
  getQuadNetPath({ x: 22, y: 12 }, { x: 98, y: 12 }, { x: 98, y: 22 }, { x: 22, y: 22 }, 10, 4);
  getQuadNetPath({ x: 15, y: 32 }, { x: 22, y: 12 }, { x: 22, y: 22 }, { x: 15, y: 38 }, 4, 4);
  getQuadNetPath({ x: 105, y: 32 }, { x: 105, y: 38 }, { x: 98, y: 22 }, { x: 98, y: 12 }, 4, 4);
  ctx.stroke();

  // Estructura de soporte posterior (metal blanco fino)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(getX(22), getY(12));
  ctx.lineTo(getX(98), getY(12));
  ctx.moveTo(getX(22), getY(22));
  ctx.lineTo(getX(98), getY(22));
  ctx.stroke();

  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(getX(22), getY(12));
  ctx.lineTo(getX(22), getY(22));
  ctx.moveTo(getX(98), getY(12));
  ctx.lineTo(getX(98), getY(22));
  ctx.stroke();

  // Profundidad lateral
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(getX(15), getY(32));
  ctx.lineTo(getX(22), getY(12));
  ctx.moveTo(getX(105), getY(32));
  ctx.lineTo(getX(98), getY(12));
  ctx.moveTo(getX(15), getY(38));
  ctx.lineTo(getX(22), getY(22));
  ctx.moveTo(getX(105), getY(38));
  ctx.lineTo(getX(98), getY(22));
  ctx.stroke();

  // Marco principal frontal (Postes y travesaño blanco grueso)
  ctx.lineWidth = 4 * s;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(getX(15), getY(38));
  ctx.lineTo(getX(15), getY(32));
  ctx.lineTo(getX(105), getY(32));
  ctx.lineTo(getX(105), getY(38));
  ctx.stroke();

  ctx.restore();
}

function drawGoalSmall(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || 30) * scale;
  const s = size / 80;
  const ox = p.x,
    oy = p.y;
  const color = elem.color || '#FF6B00';

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  const getX = (xVal) => ox + (xVal - 40) * s;
  const getY = (yVal) => oy + (yVal - 25) * s;

  // Fondo translúcido de la red
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.beginPath();
  ctx.moveTo(getX(10), getY(23));
  ctx.lineTo(getX(15), getY(10));
  ctx.lineTo(getX(65), getY(10));
  ctx.lineTo(getX(70), getY(23));
  ctx.lineTo(getX(70), getY(28));
  ctx.lineTo(getX(65), getY(17));
  ctx.lineTo(getX(15), getY(17));
  ctx.lineTo(getX(10), getY(28));
  ctx.closePath();
  ctx.fill();

  // Patrón de red de diamantes
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 0.75 * s;
  ctx.beginPath();

  const getQuadNetPath = (p0, p1, p2, p3, uDivs = 8, vDivs = 6) => {
    const getPt = (u, v) => {
      const x = (1 - u) * ((1 - v) * p0.x + v * p3.x) + u * ((1 - v) * p1.x + v * p2.x);
      const y = (1 - u) * ((1 - v) * p0.y + v * p3.y) + u * ((1 - v) * p1.y + v * p2.y);
      return { x, y };
    };
    for (let i = 0; i < uDivs; i++) {
      for (let j = 0; j <= vDivs; j++) {
        const u1 = i / uDivs;
        const v1 = j / vDivs;
        if (j < vDivs) {
          const u2 = (i + 1) / uDivs;
          const v2 = (j + 1) / vDivs;
          const pt1 = getPt(u1, v1);
          const pt2 = getPt(u2, v2);
          ctx.moveTo(getX(pt1.x), getY(pt1.y));
          ctx.lineTo(getX(pt2.x), getY(pt2.y));
        }
        if (j > 0) {
          const u2 = (i + 1) / uDivs;
          const v2 = (j - 1) / vDivs;
          const pt1 = getPt(u1, v1);
          const pt2 = getPt(u2, v2);
          ctx.moveTo(getX(pt1.x), getY(pt1.y));
          ctx.lineTo(getX(pt2.x), getY(pt2.y));
        }
      }
    }
  };

  // Panels for Small Goal
  getQuadNetPath({ x: 10, y: 23 }, { x: 70, y: 23 }, { x: 65, y: 10 }, { x: 15, y: 10 }, 8, 4);
  getQuadNetPath({ x: 15, y: 10 }, { x: 65, y: 10 }, { x: 65, y: 17 }, { x: 15, y: 17 }, 8, 4);
  getQuadNetPath({ x: 10, y: 23 }, { x: 15, y: 10 }, { x: 15, y: 17 }, { x: 10, y: 28 }, 4, 4);
  getQuadNetPath({ x: 70, y: 23 }, { x: 70, y: 28 }, { x: 65, y: 17 }, { x: 65, y: 10 }, 4, 4);
  ctx.stroke();

  // Estructura de soporte posterior
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(getX(15), getY(10));
  ctx.lineTo(getX(65), getY(10));
  ctx.moveTo(getX(15), getY(17));
  ctx.lineTo(getX(65), getY(17));
  ctx.stroke();

  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(getX(15), getY(10));
  ctx.lineTo(getX(15), getY(17));
  ctx.moveTo(getX(65), getY(10));
  ctx.lineTo(getX(65), getY(17));
  ctx.stroke();

  // Profundidad lateral
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(getX(10), getY(23));
  ctx.lineTo(getX(15), getY(10));
  ctx.moveTo(getX(70), getY(23));
  ctx.lineTo(getX(65), getY(10));
  ctx.moveTo(getX(10), getY(28));
  ctx.lineTo(getX(15), getY(17));
  ctx.moveTo(getX(70), getY(28));
  ctx.lineTo(getX(65), getY(17));
  ctx.stroke();

  // Marco principal frontal (Postes y travesaño)
  ctx.lineWidth = 3.5 * s;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(getX(10), getY(28));
  ctx.lineTo(getX(10), getY(23));
  ctx.lineTo(getX(70), getY(23));
  ctx.lineTo(getX(70), getY(28));
  ctx.stroke();

  ctx.restore();
}

function drawBarrier(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || 24) * scale;
  const s = size / 100;
  const color = elem.color || '#ffffff';

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  ctx.beginPath();
  ctx.moveTo(p.x - 45 * s, p.y + 15 * s);
  ctx.lineTo(p.x - 45 * s, p.y - 12 * s);
  ctx.lineTo(p.x + 45 * s, p.y - 12 * s);
  ctx.lineTo(p.x + 45 * s, p.y + 15 * s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * s;
  ctx.stroke();

  ctx.restore();
}

function drawDummy(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || 40) * scale;
  const s = size / 80;
  const color = elem.color || '#2196F3';
  const dark = color === '#2196F3' ? '#1565C0' : color;

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 30 * s, 8 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();

  ctx.fillStyle = '#444';
  ctx.fillRect(p.x - 2 * s, p.y - 15 * s, 4 * s, 45 * s);

  ctx.beginPath();
  ctx.moveTo(p.x - 12 * s, p.y - 15 * s);
  ctx.quadraticCurveTo(p.x, p.y - 20 * s, p.x + 12 * s, p.y - 15 * s);
  ctx.lineTo(p.x + 10 * s, p.y + 10 * s);
  ctx.quadraticCurveTo(p.x, p.y + 12 * s, p.x - 10 * s, p.y + 10 * s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x - 15 * s, p.y - 12 * s);
  ctx.quadraticCurveTo(p.x, p.y - 18 * s, p.x + 15 * s, p.y - 12 * s);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.beginPath();
  ctx.arc(p.x, p.y - 28 * s, 8 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE0B2';
  ctx.fill();
  ctx.strokeStyle = '#FFCC80';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawPole(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || 24) * scale;
  const s = size / 80;
  const color = elem.color || '#FFD700';

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  ctx.fillStyle = color;
  ctx.fillRect(p.x - 2 * s, p.y - 35 * s, 4 * s, 55 * s);

  ctx.beginPath();
  ctx.moveTo(p.x - 8 * s, p.y + 20 * s);
  ctx.lineTo(p.x, p.y + 5 * s);
  ctx.lineTo(p.x + 8 * s, p.y + 20 * s);
  ctx.closePath();
  ctx.fillStyle = '#FF6B00';
  ctx.fill();
  ctx.strokeStyle = '#E65100';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#E65100';
  ctx.beginPath();
  ctx.roundRect(p.x - 10 * s, p.y + 18 * s, 20 * s, 4 * s, s);
  ctx.fill();

  ctx.restore();
}

function drawLadder(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || 24) * scale;
  const color = elem.color || '#FFD700';
  const hw = size / 2;
  const hh = size * 0.2;

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x - hw, p.y - hh);
  ctx.lineTo(p.x + hw, p.y - hh);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x - hw, p.y + hh);
  ctx.lineTo(p.x + hw, p.y + hh);
  ctx.stroke();

  for (const f of [0.2, 0.4, 0.6, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(p.x - hw + size * f, p.y - hh);
    ctx.lineTo(p.x - hw + size * f, p.y + hh);
    ctx.stroke();
  }

  ctx.restore();
}

function drawWeights(ctx, cw, ch, elem, scale) {
  const p = pos(elem, cw, ch);
  const size = (elem.baseSize || 40) * scale;
  const s = size / 50;
  const color = elem.color || '#333';

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.roundRect(p.x - 15 * s, p.y - 3 * s, 30 * s, 6 * s, s);
  ctx.fill();

  for (const [x, w, h, yOff] of [
    [-21, 6, 26, 0],
    [-17, 4, 18, -4],
    [13, 4, 18, -4],
    [17, 6, 26, 0],
  ]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(p.x + x * s, p.y + (yOff - h / 2) * s, w * s, h * s, s);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(p.x - 19 * s, p.y - 11 * s, 2 * s, 8 * s);
  ctx.fillRect(p.x + 19 * s, p.y - 11 * s, 2 * s, 8 * s);

  ctx.restore();
}

function drawStraightLine(ctx, cw, ch, elem, scale) {
  if (!elem.pointsRatio || elem.pointsRatio.length < 2) {
    if (elem.x1 !== undefined) {
      const refW = elem.sourceWidth || 1280;
      const refH = elem.sourceHeight || 720;
      const p1 = ratioToDisplay(elem.x1 / refW, elem.y1 / refH, currentViewMode, cw, ch);
      const p2 = ratioToDisplay(elem.x2 / refW, elem.y2 / refH, currentViewMode, cw, ch);
      const progress = clamp01(elem._drawProgress);
      const currentEnd = progress < 1 ? pointAtProgress(p1, p2, progress) : p2;
      drawLineSegment(ctx, p1, currentEnd, elem, scale);
      if (elem.type === 'straight-arrow' && progress > 0.08) {
        drawArrowhead(ctx, p1, currentEnd, elem, scale);
      }
    }
    return;
  }
  const p1 = ratioToDisplay(elem.pointsRatio[0].x, elem.pointsRatio[0].y, currentViewMode, cw, ch);
  const p2 = ratioToDisplay(elem.pointsRatio[1].x, elem.pointsRatio[1].y, currentViewMode, cw, ch);
  const progress = clamp01(elem._drawProgress);
  const currentEnd = progress < 1 ? pointAtProgress(p1, p2, progress) : p2;
  drawLineSegment(ctx, p1, currentEnd, elem, scale);

  if (elem.type === 'straight-arrow' && progress > 0.08) {
    drawArrowhead(ctx, p1, currentEnd, elem, scale);
  }
}

function drawLineSegment(ctx, p1, p2, elem, scale) {
  const thickness = (elem.baseThickness || elem.thickness || 1) * scale * 0.7;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = elem.color || '#000';
  ctx.lineWidth = Math.max(1, thickness);
  ctx.lineCap = 'round';
  setLineDash(ctx, elem, scale);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawArrowhead(ctx, from, to, elem, scale) {
  const thickness = (elem.baseThickness || elem.thickness || 1) * scale * 0.7;
  const headLen = Math.max(8, thickness * 4);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - Math.PI / 6),
    to.y - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + Math.PI / 6),
    to.y - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fillStyle = elem.color || '#000';
  ctx.fill();
  ctx.restore();
}

function drawCurveLine(ctx, cw, ch, elem, scale) {
  const pts = elem.pointsRatio || elem.points;
  if (!pts || pts.length < 2) return;
  const points = elem.pointsRatio
    ? pts.map((p) => ratioToDisplay(p.x, p.y, currentViewMode, cw, ch))
    : pts.map((p) =>
        ratioToDisplay(
          p.x / (elem.sourceWidth || 1280),
          p.y / (elem.sourceHeight || 720),
          currentViewMode,
          cw,
          ch,
        ),
      );

  const progress = clamp01(elem._drawProgress);
  if (progress < 1) {
    const visiblePoints = partialPolyline(sampleCurve(points), progress);
    strokePolyline(ctx, visiblePoints, elem, scale);
    if (elem.type === 'curve-arrow' && visiblePoints.length >= 2 && progress > 0.08) {
      drawArrowhead(
        ctx,
        visiblePoints[visiblePoints.length - 2],
        visiblePoints[visiblePoints.length - 1],
        elem,
        scale,
      );
    }
    return;
  }

  const thickness = (elem.baseThickness || elem.thickness || 1) * scale * 0.7;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else if (points.length === 3) {
    ctx.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
  } else {
    for (let i = 1; i < points.length - 2; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    const last = points[points.length - 1];
    ctx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, last.x, last.y);
  }
  ctx.strokeStyle = elem.color || '#000';
  ctx.lineWidth = Math.max(1, thickness);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  setLineDash(ctx, elem, scale);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  if (elem.type === 'curve-arrow' && points.length >= 2) {
    const end = points[points.length - 1];
    const prev = points[points.length - 2];
    drawArrowhead(ctx, prev, end, elem, scale);
  }
}

function drawCircleShape(ctx, cw, ch, elem, scale) {
  let cx, cy, rx, ry;

  if (elem.pointsRatio && elem.pointsRatio.length >= 2) {
    const p1 = ratioToDisplay(
      elem.pointsRatio[0].x,
      elem.pointsRatio[0].y,
      currentViewMode,
      cw,
      ch,
    );
    const p2 = ratioToDisplay(
      elem.pointsRatio[1].x,
      elem.pointsRatio[1].y,
      currentViewMode,
      cw,
      ch,
    );
    cx = (p1.x + p2.x) / 2;
    cy = (p1.y + p2.y) / 2;
    rx = Math.abs(p2.x - p1.x) / 2;
    ry = Math.abs(p2.y - p1.y) / 2;
  } else if (elem.xRatio !== undefined && elem.yRatio !== undefined && elem.width && elem.height) {
    const coords = ratioToDisplay(elem.xRatio, elem.yRatio, currentViewMode, cw, ch);
    cx = coords.x;
    cy = coords.y;
    rx = (elem.width / 2) * scale;
    ry = (elem.height / 2) * scale;
  } else if (elem.xRatio !== undefined && elem.yRatio !== undefined && elem.radius) {
    const coords = ratioToDisplay(elem.xRatio, elem.yRatio, currentViewMode, cw, ch);
    cx = coords.x;
    cy = coords.y;
    rx = elem.radius * scale;
    ry = elem.radius * scale;
  } else if (elem.x !== undefined && elem.y !== undefined && elem.radius) {
    const coords = ratioToDisplay(
      elem.x / (elem.sourceWidth || 1280),
      elem.y / (elem.sourceHeight || 720),
      currentViewMode,
      cw,
      ch,
    );
    cx = coords.x;
    cy = coords.y;
    rx = elem.radius * scale;
    ry = elem.radius * scale;
  } else {
    return;
  }

  if (!rx || rx <= 0 || !ry || ry <= 0) return;
  const thickness = (elem.baseThickness || elem.thickness || 1) * scale * 0.7;
  const progress = clamp01(elem._drawProgress);
  const startAngle = -Math.PI / 2;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, startAngle, startAngle + Math.PI * 2 * progress);
  if (progress >= 1 && elem.fillColor && elem.fillColor !== 'transparent') {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = elem.fillColor;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = elem.color || '#000';
  ctx.lineWidth = Math.max(1, thickness);
  setLineDash(ctx, elem, scale);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawRectangleShape(ctx, cw, ch, elem, scale) {
  let rx, ry, rw, rh;

  if (elem.pointsRatio && elem.pointsRatio.length >= 2) {
    const p1 = ratioToDisplay(
      elem.pointsRatio[0].x,
      elem.pointsRatio[0].y,
      currentViewMode,
      cw,
      ch,
    );
    const p2 = ratioToDisplay(
      elem.pointsRatio[1].x,
      elem.pointsRatio[1].y,
      currentViewMode,
      cw,
      ch,
    );
    rx = Math.min(p1.x, p2.x);
    ry = Math.min(p1.y, p2.y);
    rw = Math.abs(p2.x - p1.x);
    rh = Math.abs(p2.y - p1.y);
  } else if (elem.x !== undefined && elem.width) {
    const refW = elem.sourceWidth || 1280;
    const refH = elem.sourceHeight || 720;
    const p1 = ratioToDisplay(elem.x / refW, elem.y / refH, currentViewMode, cw, ch);
    const p2 = ratioToDisplay(
      (elem.x + elem.width) / refW,
      (elem.y + elem.height) / refH,
      currentViewMode,
      cw,
      ch,
    );
    rx = Math.min(p1.x, p2.x);
    ry = Math.min(p1.y, p2.y);
    rw = Math.abs(p2.x - p1.x);
    rh = Math.abs(p2.y - p1.y);
  } else {
    return;
  }

  if (!rw || rw <= 0 || !rh || rh <= 0) return;
  const thickness = (elem.baseThickness || elem.thickness || 1) * scale * 0.7;
  ctx.save();
  applyRotation(ctx, rx + rw / 2, ry + rh / 2, elem.rotation);
  if (elem.fillColor && elem.fillColor !== 'transparent') {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = elem.fillColor;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = elem.color || '#000';
  ctx.lineWidth = Math.max(1, thickness);
  setLineDash(ctx, elem, scale);
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCustomShape(ctx, cw, ch, elem, scale) {
  const pts = elem.pointsRatio || elem.points;
  if (!pts || pts.length < 2) return;
  const points = elem.pointsRatio
    ? pts.map((p) => ratioToDisplay(p.x, p.y, currentViewMode, cw, ch))
    : pts.map((p) =>
        ratioToDisplay(
          p.x / (elem.sourceWidth || 1280),
          p.y / (elem.sourceHeight || 720),
          currentViewMode,
          cw,
          ch,
        ),
      );
  const thickness = (elem.baseThickness || elem.thickness || 1) * scale * 0.7;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (elem.closed || elem.isCustomShapeComplete) {
    ctx.closePath();
  }
  if (elem.fillColor && elem.fillColor !== 'transparent') {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = elem.fillColor;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = elem.color || '#000';
  ctx.lineWidth = Math.max(1, thickness);
  setLineDash(ctx, elem, scale);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawFreeText(ctx, cw, ch, elem, scale) {
  const text = elem.text || elem.value || '';
  if (!text) return;
  const sourceWidth = elem.imageWidth || cw;
  const sourceHeight = elem.imageHeight || ch;
  const scaleX = cw / sourceWidth;
  const scaleY = ch / sourceHeight;
  const textScale =
    elem.imageWidth && elem.imageHeight
      ? Math.min(scaleX, scaleY)
      : scale;
  const sourceX =
    elem.textX !== undefined
      ? elem.textX
      : elem.imageWidth && elem.xRatio !== undefined
      ? elem.xRatio * sourceWidth
      : elem.x || 0;
  const sourceY =
    elem.textY !== undefined
      ? elem.textY
      : elem.imageHeight && elem.yRatio !== undefined
      ? elem.yRatio * sourceHeight
      : elem.y || 0;
  const p =
    elem.imageWidth && elem.imageHeight
      ? { x: sourceX * scaleX, y: sourceY * scaleY }
      : pos(elem, cw, ch);
  const baseFontSize = elem.baseFontSize || elem.baseSize || elem.fontSize || 16;
  const fs = baseFontSize * textScale;
  const color = elem.color || '#000';
  const bg = elem.backgroundColor || 'transparent';
  const lineHeight = fs * 1.2;
  const pad = 4 * textScale;
  const maxTextWidth =
    elem.textMaxWidth !== undefined
      ? Math.max(40 * textScale, elem.textMaxWidth * scaleX)
      : elem.imageWidth
        ? Math.max(40 * textScale, (elem.imageWidth - sourceX - 8) * scaleX)
      : Math.max(40 * textScale, cw - p.x - pad * 2);

  ctx.save();
  applyRotation(ctx, p.x, p.y, elem.rotation);

  ctx.font = `bold ${fs}px ${FONT_STACK}`;
  const pushWrappedWord = (wrapped, word) => {
    if (!word) return;
    let current = wrapped[wrapped.length - 1];
    let rest = word;
    while (rest) {
      const next = current ? `${current} ${rest}` : rest;
      if (ctx.measureText(next).width <= maxTextWidth) {
        wrapped[wrapped.length - 1] = next;
        return;
      }
      if (current) {
        wrapped.push('');
        current = '';
        continue;
      }
      let cut = 1;
      while (cut < rest.length && ctx.measureText(rest.slice(0, cut + 1)).width <= maxTextWidth) {
        cut += 1;
      }
      wrapped[wrapped.length - 1] = rest.slice(0, cut);
      rest = rest.slice(cut);
      if (rest) wrapped.push('');
    }
  };
  const lines = String(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .flatMap((line) => {
      const words = line.split(' ');
      const wrapped = [''];
      for (const word of words) {
        pushWrappedWord(wrapped, word);
      }
      return wrapped;
    });
  const tw = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
  const th = lines.length * lineHeight;

  if (bg && bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(p.x, p.y, tw + pad * 2, th + pad * 2);
  }

  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => {
    ctx.fillText(line, p.x + pad, p.y + pad + index * lineHeight);
  });

  ctx.restore();
}

function drawConnector(ctx, cw, ch, conn, elements) {
  const fromEl = elements.find((e) => e.id === conn.fromId);
  const toEl = elements.find((e) => e.id === conn.toId);
  if (!fromEl || !toEl) return;

  const p1 = pos(fromEl, cw, ch);
  const p2 = pos(toEl, cw, ch);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = conn.color || '#000';
  ctx.lineWidth = conn.thickness || 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

const POSITIONED_DRAWERS = {
  player: drawPlayer,
  staff: drawStaff,
  ball: drawBall,
  'ball-shadow': drawBallShadow,
  cone: drawCone,
  'cone-pro': drawConePro,
  'cone-flat': drawConeFlat,
  ring: drawRing,
  goal: drawGoal,
  'goal-large': drawGoalLarge,
  'goal-small': drawGoalSmall,
  barrier: drawBarrier,
  dummy: drawDummy,
  pole: drawPole,
  ladder: drawLadder,
  weights: drawWeights,
};

const LINE_DRAWERS = {
  'straight-line': drawStraightLine,
  'straight-arrow': drawStraightLine,
  'curve-line': drawCurveLine,
  'curve-arrow': drawCurveLine,
  circle: drawCircleShape,
  rectangle: drawRectangleShape,
  'custom-shape': drawCustomShape,
};

export function renderFrameToCanvas(ctx, cw, ch, elements, connectors, fieldImage, _options = {}) {
  currentViewMode = _options.viewMode || 'entire';
  ctx.fillStyle = FIELD_BG;
  ctx.fillRect(0, 0, cw, ch);

  if (fieldImage) {
    ctx.drawImage(fieldImage, 0, 0, cw, ch);
  }

  const scale = getScale(cw, ch);
  const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (const elem of sorted) {
    if (LINE_DRAWERS[elem.type]) {
      LINE_DRAWERS[elem.type](ctx, cw, ch, elem, scale);
    } else if (POSITIONED_DRAWERS[elem.type]) {
      POSITIONED_DRAWERS[elem.type](ctx, cw, ch, elem, scale, _options);
    } else if (elem.type === 'free-text' || elem.text) {
      drawFreeText(ctx, cw, ch, elem, scale);
    }
  }

  if (connectors && connectors.length) {
    for (const conn of connectors) {
      drawConnector(ctx, cw, ch, conn, sorted);
    }
  }
}
