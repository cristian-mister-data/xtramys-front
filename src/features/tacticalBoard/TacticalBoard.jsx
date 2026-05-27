/**
 * Pizarra táctica completa (web).
 *
 * Sistema de coordenadas:
 *   - Cada elemento almacena posiciones en ratios 0..1 del CAMPO COMPLETO.
 *   - El viewMode (entire/halfLeft/halfRight/halfUp/halfDown) sólo cambia el
 *     viewport visible. ratioToDisplay/displayToRatio se encargan de mapear.
 *
 * Modelo de datos: array `elements[]` con discriminador `type`:
 *   - player, team-players, coaching-staff, ball, cone-pro, cone-flat, ring,
 *     goal-large, goal-small, barrier, dummy, pole, ladder, weights,
 *     line, curve, rect, circle, text.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Text, Group, Rect, Ellipse } from 'react-konva';
import styled from 'styled-components';
import FieldSVGRenderer from './FieldSVGRenderer';
import {
  getAspectForView,
  ratioToDisplay,
  displayToRatio,
} from './fieldConfigs';
import { buildFormation } from './formations';
import Toolbar from './Toolbar';
import Palette from './Palette';
import IconRenderer from './IconRenderer';
import { LineShape, RectShape, CircleShape } from './ShapeRenderers';
import FormationModal from './FormationModal';
import FieldSelectorModal from './FieldSelectorModal';
import VideoRecorderPanel from './VideoRecorderPanel';
import LeftEditPanel from './LeftEditPanel';
import { TEAM_COLORS } from './colorPalette';
import { confirmAction } from '@/ui/confirm';
import {
  PALETTE_PLAYERS, PALETTE_GROUPS, MATERIALS_ICONS,
  MATERIAL_TYPES_SET, getZIndexBaseForType,
} from './icons';
import { Muted } from '@/ui/primitives';

const ICON_TYPES_SET = new Set([
  'player', 'team-players', 'coaching-staff', 'ball',
  ...MATERIAL_TYPES_SET,
]);

// Mapa rápido tipo → datos por defecto del paletteIcon
const PALETTE_BY_TYPE = (() => {
  const map = {};
  [...PALETTE_PLAYERS, ...PALETTE_GROUPS, ...MATERIALS_ICONS].forEach((p) => {
    if (!map[p.type]) map[p.type] = p;
  });
  return map;
})();

// Wrapper más amplio (sin marco tablet). El campo ocupa hasta 1800px.
const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
`;

const StageWrap = styled.div`
  background: #000;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  position: relative;
  touch-action: none;
  box-shadow: 0 8px 30px rgba(0,0,0,0.35);
`;

const StageInner = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
`;

const FieldLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const KonvaLayer = styled.div`
  position: relative;
  z-index: 2;
`;

const StatusLine = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #cbd5e1;
`;

const newId = (prefix = 'el') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Escena VACÍA — port del comportamiento del source (paleta separada del field).
function defaultScene() {
  return [];
}

const HISTORY_LIMIT = 60;

function getDraggableGroup(node) {
  while (node && !node.attrs?.draggable) {
    node = node.getParent();
  }
  return node;
}

function isDraggedNodeOutside(node, width, height) {
  const box = node.getClientRect({ skipTransform: true, skipShadow: true });
  const left = node.x() + box.x;
  const top = node.y() + box.y;
  const right = left + box.width;
  const bottom = top + box.height;
  return left < 0 || right > width || top < 0 || bottom > height;
}

function setDeleteIndicatorVisible(node, visible) {
  const indicator = node?.findOne?.('.delIndicator');
  if (!indicator) return;
  indicator.visible(visible);
  if (visible) indicator.moveToTop();
}

export default function TacticalBoard({
  initialElements,
  initialLineType = 'full',
  initialViewMode = 'entire',
  onSave,
  onCancel,
  saveLabel = 'Guardar',
}) {
  const wrapRef = useRef(null);
  const stageRef = useRef(null);

  const [size, setSize] = useState({ w: 1200, h: 1200 * getAspectForView('entire') });
  const [lineType, setLineType] = useState(initialLineType);
  const [viewMode, setViewMode] = useState(initialViewMode);

  const [elements, setElements] = useState(() =>
    Array.isArray(initialElements) && initialElements.length > 0
      ? initialElements
      : defaultScene()
  );
  const [selectedId, setSelectedId] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [color, setColor] = useState('#000000');
  const [lineDashed, setLineDashed] = useState(false);
  const [paletteColor, setPaletteColor] = useState({});
  const [editingPaletteItem, setEditingPaletteItem] = useState(null);

  const handlePaletteColorChange = (iconId, newColor) => {
    setPaletteColor((prev) => ({ ...prev, [iconId]: newColor }));
  };

  const handleLongPressPaletteItem = (icon) => {
    setEditingPaletteItem(icon);
  };

  const handlePaletteItemChange = (patch) => {
    if (!editingPaletteItem) return;
    setEditingPaletteItem((prev) => ({ ...prev, ...patch }));
    // Also apply the color change to the palette defaults
    if (patch.color !== undefined) {
      setPaletteColor((prev) => ({ ...prev, [editingPaletteItem.id]: patch.color }));
    }
  };

  const getPaletteProto = (type) => {
    const proto = PALETTE_BY_TYPE[type] ? { ...PALETTE_BY_TYPE[type] } : { type };
    if (paletteColor[proto.id]) proto.color = paletteColor[proto.id];
    return proto;
  };

  const [drawing, setDrawing] = useState(null);
  const [connectorFrom, setConnectorFrom] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);

  const historyRef = useRef({ past: [], future: [] });
  const [, forceTick] = useState(0);
  const bumpHistory = () => forceTick((x) => x + 1);

  const [formationOpen, setFormationOpen] = useState(false);
  const [fieldSelOpen, setFieldSelOpen] = useState(false);
  const [keyframes, setKeyframes] = useState([]);
  const [draggingOutside, setDraggingOutside] = useState(false);

  // --- stage sizing — depende del viewMode (aspect varía) ---
  useEffect(() => {
    const update = () => {
      const w = wrapRef.current?.clientWidth || 1200;
      const aspect = getAspectForView(viewMode);
      const h = w * aspect;
      setSize({ w, h });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [viewMode]);

  // --- history helpers ---
  const pushHistory = useCallback((prev) => {
    const h = historyRef.current;
    h.past.push(prev);
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    bumpHistory();
  }, []);

  const applyChange = useCallback(
    (updater) => {
      setElements((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        pushHistory(prev);
        return next;
      });
    },
    [pushHistory],
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    setElements((current) => {
      const prev = h.past.pop();
      h.future.push(current);
      bumpHistory();
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    setElements((current) => {
      const next = h.future.pop();
      h.past.push(current);
      bumpHistory();
      return next;
    });
  }, []);

  // --- hotkeys ---
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          applyChange((prev) => prev.filter((el) => el.id !== selectedId));
          setSelectedId(null);
        }
        return;
      }
      if (e.key === 'Escape') {
        setDrawing(null);
        setSelectedId(null);
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyChange, undo, redo, selectedId]);

  // --- coord helpers ---
  const r2p = useCallback((xR, yR) => ratioToDisplay(xR, yR, viewMode, size.w, size.h), [viewMode, size.w, size.h]);
  const p2r = useCallback((px, py) => displayToRatio(px, py, viewMode, size.w, size.h), [viewMode, size.w, size.h]);

  const stageToRatio = useCallback(
    (stage) => {
      const pos = stage.getPointerPosition();
      if (!pos) return null;
      return p2r(pos.x, pos.y);
    },
    [p2r],
  );

  // --- stage interactions ---
  const handleStageMouseDown = (e) => {
    if (e.target !== e.target.getStage() && e.target.getParent()?.attrs?.draggable) {
      return;
    }
    const stage = e.target.getStage();
    const p = stageToRatio(stage);
    if (!p) return;

    if (activeTool === 'select' || activeTool === 'eraser' || activeTool === 'connector') {
      setSelectedId(null);
      return;
    }

    // ÁTICOS / MATERIAL / GROUP — colocar elemento por click
    if (ICON_TYPES_SET.has(activeTool)) {
      const proto = getPaletteProto(activeTool);
      const next = {
        id: newId(activeTool),
        type: activeTool,
        x: p.x,
        y: p.y,
        color: proto.color,
        size: proto.size,
        rotation: 0,
        zIndex: getZIndexBaseForType(activeTool),
      };
      if (activeTool === 'player') {
        next.number = (Math.max(0, ...elements.filter((e2) => e2.type === 'player' && e2.color === proto.color).map((e2) => Number(e2.number) || 0)) + 1) || 1;
      }
      applyChange((prev) => [...prev, next]);
      return;
    }

    if (activeTool === 'text') {
      const id = newId('txt');
      applyChange((prev) => [...prev, {
        id, type: 'text', x: p.x, y: p.y,
        text: '', color, fontSize: 0.03,
      }]);
      setEditingTextId(id);
      setSelectedId(id);
      return;
    }

    // drawing tools (líneas / formas)
    if (activeTool === 'straight-line' || activeTool === 'straight-arrow'
        || activeTool === 'curve-line' || activeTool === 'curve-arrow') {
      setDrawing((d) => {
        const arrow = activeTool.endsWith('arrow');
        const type = activeTool.startsWith('curve') ? 'curve' : 'line';
        const maxPts = type === 'curve' ? 3 : 2;
        const current = d && d.type === type && d.arrow === arrow ? d : {
          type, arrow, color, thickness: 0.004, dashed: lineDashed, points: [],
        };
        const next = { ...current, points: [...current.points, p] };
        if (next.points.length >= maxPts) {
          applyChange((prev) => [...prev, { id: newId(type), ...next }]);
          return null;
        }
        return next;
      });
      return;
    }

    if (activeTool === 'rectangle' || activeTool === 'circle') {
      const drawType = activeTool === 'rectangle' ? 'rect' : 'circle';
      setDrawing((d) => {
        if (!d || d.type !== drawType) {
          return { type: drawType, points: [p], color, thickness: 0.004, dashed: lineDashed };
        }
        const p0 = d.points[0];
        if (drawType === 'rect') {
          const x = Math.min(p0.x, p.x), y = Math.min(p0.y, p.y);
          const w = Math.abs(p.x - p0.x), h = Math.abs(p.y - p0.y);
          applyChange((prev) => [...prev, {
            id: newId('rect'), type: 'rect', x, y, w, h,
            color: d.color, thickness: d.thickness, dashed: d.dashed,
          }]);
        } else {
          const dx = p.x - p0.x, dy = p.y - p0.y;
          const radius = Math.hypot(dx, dy);
          applyChange((prev) => [...prev, {
            id: newId('circ'), type: 'circle', x: p0.x, y: p0.y, radius,
            color: d.color, thickness: d.thickness, dashed: d.dashed,
          }]);
        }
        return null;
      });
    }
  };

  // --- drag handlers con zona de eliminacion ---
  const onElementDragStart = (e) => {
    const node = getDraggableGroup(e.target);
    if (!node) return;
    node.opacity(1); node.scaleX(1); node.scaleY(1);
    setDeleteIndicatorVisible(node, false);
    setDraggingOutside(false);
  };

  const onElementDragMove = (e) => {
    const node = getDraggableGroup(e.target);
    if (!node) return;
    const outside = isDraggedNodeOutside(node, size.w, size.h);
    setDraggingOutside(outside);
    if (outside) {
      node.opacity(0.4); node.scaleX(0.75); node.scaleY(0.75);
      setDeleteIndicatorVisible(node, true);
    } else {
      node.opacity(1); node.scaleX(1); node.scaleY(1);
      setDeleteIndicatorVisible(node, false);
    }
    node.getLayer()?.batchDraw();
  };

  const onElementDragEnd = (id) => (e) => {
    const node = getDraggableGroup(e.target);
    if (!node) return;
    
    const outside = isDraggedNodeOutside(node, size.w, size.h);
    const r = p2r(node.x(), node.y());

    const el = elements.find((it) => it.id === id);
    if (el) {
      const pt = r2p(el.x, el.y);
      node.position({ x: pt.x, y: pt.y });
    }

    node.opacity(1); node.scaleX(1); node.scaleY(1);
    setDeleteIndicatorVisible(node, false);
    node.getLayer()?.batchDraw();
    setDraggingOutside(false);

    if (outside) { 
      applyChange((prev) => prev.filter((it) => it.id !== id)); 
      setSelectedId(null); 
    } else { 
      const x = Math.max(0, Math.min(1, r.x)); 
      const y = Math.max(0, Math.min(1, r.y)); 
      applyChange((prev) => prev.map((it) => (it.id === id ? { ...it, x, y } : it))); 
    }
  };

  const onSelect = (id) => (e) => {
    e.cancelBubble = true;
    if (activeTool === 'eraser') {
      applyChange((prev) => prev.filter((el) => el.id !== id));
      setSelectedId(null);
      return;
    }
    if (activeTool === 'connector') {
      const target = elements.find((el) => el.id === id);
      if (!target || !ICON_TYPES_SET.has(target.type)) return;
      if (!connectorFrom) {
        setConnectorFrom(id);
        setSelectedId(id);
        return;
      }
      if (connectorFrom === id) { setConnectorFrom(null); return; }
      applyChange((prev) => [...prev, {
        id: newId('conn'), type: 'connector',
        fromId: connectorFrom, toId: id,
        color, thickness: 0.004, dashed: lineDashed,
      }]);
      setConnectorFrom(null);
      setSelectedId(null);
      return;
    }
    if (activeTool === 'select') setSelectedId(id);
  };

  // --- toolbar actions ---
  const clearAll = async () => {
    if (await confirmAction('¿Vaciar la pizarra?', { destructive: true })) {
      applyChange([]);
      setSelectedId(null);
    }
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    applyChange((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const applyFormation = ({ count, name, target }) => {
    const teamColor = target === 'home' ? TEAM_COLORS.home : TEAM_COLORS.away;
    const prefix = target === 'home' ? 'H' : 'A';
    const mirror = target === 'away';
    const formation = buildFormation({ count, name, color: teamColor, prefix, mirror });
    applyChange((prev) => {
      const kept = prev.filter((el) => !(el.type === 'player' && el.color === teamColor));
      return [...kept, ...formation];
    });
  };

  const onFieldSelect = (lt, vm) => {
    setLineType(lt);
    setViewMode(vm);
  };

  const handleSave = () => {
    if (!onSave || !stageRef.current) return;
    let dataUrl = '';
    try {
      dataUrl = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
    } catch (err) {
      console.error('Error capturing tactical board snapshot', err);
    }
    onSave({ imageBase64: dataUrl, elements, fieldType: lineType, viewMode });
  };

  const setFrameElements = useCallback((els) => {
    setElements(els);
  }, []);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const refScale = useMemo(() => Math.max(size.w, size.h) || size.w, [size]);

  // --- renderers ---
  const elementsById = useMemo(() => {
    const m = new Map();
    elements.forEach((el) => m.set(el.id, el));
    return m;
  }, [elements]);

  const renderElement = (el) => {
    const selected = el.id === selectedId;
    const pt = (typeof el.x === 'number' && typeof el.y === 'number') ? r2p(el.x, el.y) : null;

    if (el.type === 'ball-shadow' && pt) {
      const shadowScale = typeof el.shadowScale === 'number' ? el.shadowScale : 0.8;
      const shadowOpacity = typeof el.opacity === 'number' ? el.opacity : 0.35;
      const basePx = (el.size || 24) * 1.15 * Math.max(0.7, Math.min(1.6, size.w / 900));
      const shadowW = basePx * 0.95 * shadowScale;
      const shadowH = basePx * 0.36 * shadowScale;
      const maxR = shadowW / 2;
      const cx = pt.x + shadowW * 0.12;
      const cy = pt.y + shadowH * 0.08;
      return (
        <Ellipse
          key={el.id}
          x={cx}
          y={cy}
          radiusX={shadowW / 2}
          radiusY={shadowH / 2}
          rotation={-8}
          fillRadialGradientStartPoint={{ x: 0, y: 0 }}
          fillRadialGradientStartRadius={0}
          fillRadialGradientEndPoint={{ x: 0, y: 0 }}
          fillRadialGradientEndRadius={maxR}
          fillRadialGradientColorStops={[
            0, `rgba(0,0,0,${Math.min(0.75, shadowOpacity * 1.3)})`,
            0.3, `rgba(0,0,0,${shadowOpacity * 0.75})`,
            0.65, `rgba(0,0,0,${shadowOpacity * 0.3})`,
            1, `rgba(0,0,0,0)`,
          ]}
          listening={false}
        />
      );
    }

    if (el.type === 'connector') {
      const a = elementsById.get(el.fromId);
      const b = elementsById.get(el.toId);
      if (!a || !b) return null;
      const pa = r2p(a.x, a.y);
      const pb = r2p(b.x, b.y);
      const sw = Math.max(1, (el.thickness || 0.004) * refScale);
      return (
        <Line
          key={el.id}
          points={[pa.x, pa.y, pb.x, pb.y]}
          stroke={selected ? '#fbbf24' : (el.color || '#000')}
          strokeWidth={sw}
          dash={el.dashed ? [sw * 2, sw * 2] : undefined}
          listening
          onClick={onSelect(el.id)}
          onTap={onSelect(el.id)}
          hitStrokeWidth={Math.max(12, sw * 4)}
        />
      );
    }

    // Iconos (jugadores, materiales, grupos) → IconRenderer
    if (pt && ICON_TYPES_SET.has(el.type)) {
      return (
        <IconRenderer
          key={el.id}
          el={el}
          scale={size.w}
          x={pt.x}
          y={pt.y}
          selected={selected}
          onDragStart={onElementDragStart}
          onDragEnd={onElementDragEnd(el.id)}
          onDragMove={onElementDragMove}
          onClick={onSelect(el.id)}
          onTap={onSelect(el.id)}
        />
      );
    }

    if (el.type === 'line' || el.type === 'curve') {
      return (
        <LineShape
          key={el.id}
          el={el}
          selected={selected}
          onSelect={onSelect(el.id)}
          p2r={p2r}
          r2p={r2p}
          applyChange={applyChange}
          refScale={refScale}
          viewMode={viewMode}
          size={size}
        />
      );
    }

    if (el.type === 'rect') {
      return (
        <RectShape
          key={el.id}
          el={el}
          selected={selected}
          onSelect={onSelect(el.id)}
          p2r={p2r}
          r2p={r2p}
          applyChange={applyChange}
          refScale={refScale}
          viewMode={viewMode}
          size={size}
        />
      );
    }

    if (el.type === 'circle' && pt) {
      return (
        <CircleShape
          key={el.id}
          el={el}
          selected={selected}
          onSelect={onSelect(el.id)}
          p2r={p2r}
          r2p={r2p}
          applyChange={applyChange}
          refScale={refScale}
          viewMode={viewMode}
          size={size}
        />
      );
    }

    if (el.type === 'text' && pt) {
      if (el.id === editingTextId) return null;
      const fs = (el.fontSize || 0.03) * refScale;
      const textW = Math.max(80, (el.text || '').length * fs * 0.6 + 20);
      return (
        <Group key={el.id} x={pt.x} y={pt.y} draggable onDragStart={onElementDragStart} onDragEnd={onElementDragEnd(el.id)} onDragMove={onElementDragMove} onClick={onSelect(el.id)}>
          <Rect name="delIndicator" x={-10} y={-10} width={textW} height={fs + 20} stroke="#ff0000" strokeWidth={3} dash={[6, 4]} fill="rgba(255,0,0,0.2)" cornerRadius={4} listening={false} visible={false} />
          <Text x={0} y={0} text={el.text || ''} fill={el.color || '#000'} fontSize={fs} fontStyle="bold" onDblClick={() => setEditingTextId(el.id)} onDblTap={() => setEditingTextId(el.id)} stroke={selected ? '#fbbf24' : undefined} strokeWidth={selected ? 1 : 0} />
        </Group>
      );
    }

    return null;
  };

  const renderDrawingPreview = () => {
    if (!drawing || !drawing.points?.length) return null;
    if (drawing.type === 'line' || drawing.type === 'curve') {
      const pts = drawing.points.flatMap((p) => {
        const px = r2p(p.x, p.y);
        return [px.x, px.y];
      });
      const sw = Math.max(1, (drawing.thickness || 0.004) * refScale);
      return (
        <Line points={pts} stroke={drawing.color} strokeWidth={sw}
          dash={[sw * 2, sw * 2]} tension={drawing.type === 'curve' ? 0.5 : 0} listening={false} />
      );
    }
    return null;
  };

  return (
    <Wrap>
      <Toolbar
        activeTool={activeTool}
        onToolChange={(t) => { setActiveTool(t); setDrawing(null); }}
        color={color}
        onColorChange={setColor}
        lineDashed={lineDashed}
        onToggleDashed={() => setLineDashed((v) => !v)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onClear={clearAll}
        onDeleteSelected={deleteSelected}
        hasSelection={!!selectedId}
        onOpenFormation={() => setFormationOpen(true)}
        onOpenFieldSelector={() => setFieldSelOpen(true)}
        onSave={onSave ? handleSave : null}
        saveLabel={saveLabel}
        isRecording={false}
      />

      <StatusLine>
        <Muted>Herramienta: <strong>{activeTool}</strong></Muted>
        <Muted>Elementos: {elements.length}</Muted>
        <Muted>Vista: {lineType} / {viewMode}</Muted>
        <Muted>Keyframes: {keyframes.length}</Muted>
        {activeTool === 'connector' && (
          <Muted>{connectorFrom ? 'Selecciona el segundo icono' : 'Selecciona el primer icono'}</Muted>
        )}
        {onCancel && <a href="#" onClick={(e) => { e.preventDefault(); onCancel(); }} style={{ marginLeft: 'auto', fontSize: 13, color: '#cbd5e1' }}>Cancelar</a>}
      </StatusLine>

      <StageWrap ref={wrapRef}>
        <StageInner style={{ height: size.h }}>
          <FieldLayer>
            <FieldSVGRenderer
              lineType={lineType}
              viewMode={viewMode}
              width={size.w}
              height={size.h}
            />
          </FieldLayer>
          <KonvaLayer>
            <Stage
              ref={stageRef}
              width={size.w}
              height={size.h}
              onMouseDown={handleStageMouseDown}
              onTouchStart={handleStageMouseDown}
            >
              <Layer>
                {elements.map(renderElement)}
                {renderDrawingPreview()}
              </Layer>
            </Stage>
          </KonvaLayer>
          {draggingOutside && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: '4px dashed #ef4444',
                borderRadius: 8,
                pointerEvents: 'none',
                zIndex: 15,
                background: 'rgba(239,68,68,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  background: 'rgba(239,68,68,0.9)',
                  color: '#fff',
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                }}
              >
                Suelta para eliminar
              </div>
            </div>
          )}
          <VideoRecorderPanel
            stageRef={stageRef}
            elements={elements}
            setFrame={setFrameElements}
            keyframes={keyframes}
            setKeyframes={setKeyframes}
          />
          {selectedId && (
            <LeftEditPanel
              element={elements.find((e) => e.id === selectedId)}
              onChange={(next) => applyChange((prev) => prev.map((it) => (it.id === selectedId ? next : it)))}
              onDelete={deleteSelected}
              onClose={() => setSelectedId(null)}
            />
          )}
          {(() => {
            const selEl = elements.find((e) => e.id === selectedId);
            if (!selEl || selEl.type !== 'ball') return null;
            const bp = r2p(selEl.x, selEl.y);
            const isAir = selEl.trajectory === 'air';
            return (
              <div
                style={{
                  position: 'absolute',
                  left: bp.x - 50,
                  top: bp.y + 22,
                  display: 'flex',
                  gap: 2,
                  background: 'rgba(15,23,42,0.92)',
                  borderRadius: 8,
                  padding: 3,
                  zIndex: 20,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); applyChange((prev) => prev.map((it) => (it.id === selectedId ? { ...it, trajectory: 'ground' } : it))); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '3px 8px', border: 0, borderRadius: 5,
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: !isAir ? '#4CAF50' : 'rgba(255,255,255,0.1)',
                    color: !isAir ? '#fff' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.15s',
                  }}
                  title="Trayectoria por suelo"
                >
                  <span style={{ fontSize: 13 }}>➡</span> Suelo
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); applyChange((prev) => prev.map((it) => (it.id === selectedId ? { ...it, trajectory: 'air' } : it))); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '3px 8px', border: 0, borderRadius: 5,
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: isAir ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                    color: isAir ? '#fff' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.15s',
                  }}
                  title="Trayectoria por aire"
                >
                  <span style={{ fontSize: 13 }}>↗</span> Aire
                </button>
              </div>
            );
          })()}
          {editingPaletteItem && (
            <LeftEditPanel
              element={editingPaletteItem}
              isPaletteItem
              onChange={handlePaletteItemChange}
              onDelete={null}
              onClose={() => setEditingPaletteItem(null)}
            />
          )}
          {editingTextId && (() => {
            const el = elements.find((e) => e.id === editingTextId);
            if (!el) return null;
            const pt = r2p(el.x, el.y);
            const fs = (el.fontSize || 0.03) * refScale;
            return (
              <input
                autoFocus
                defaultValue={el.text || ''}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v) {
                    applyChange((prev) => prev.filter((it) => it.id !== editingTextId));
                    setSelectedId(null);
                  } else {
                    applyChange((prev) => prev.map((it) => (it.id === editingTextId ? { ...it, text: v } : it)));
                  }
                  setEditingTextId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') {
                    applyChange((prev) => prev.filter((it) => !(it.id === editingTextId && !it.text)));
                    setEditingTextId(null);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: pt.x,
                  top: pt.y,
                  fontSize: fs,
                  fontWeight: 'bold',
                  color: el.color || '#000',
                  background: 'rgba(255,255,255,0.95)',
                  border: '2px solid #fbbf24',
                  borderRadius: 4,
                  padding: '2px 6px',
                  outline: 'none',
                  zIndex: 10,
                  minWidth: 80,
                }}
              />
            );
          })()}
        </StageInner>
      </StageWrap>

      <Palette
        activeTool={activeTool}
        onSelectTool={(type) => { setActiveTool(type); setDrawing(null); }}
        paletteColors={paletteColor}
        onPaletteColorChange={handlePaletteColorChange}
        onLongPressPaletteItem={handleLongPressPaletteItem}
      />

      <FormationModal
        open={formationOpen}
        onClose={() => setFormationOpen(false)}
        onApply={applyFormation}
      />

      <FieldSelectorModal
        open={fieldSelOpen}
        onClose={() => setFieldSelOpen(false)}
        lineType={lineType}
        viewMode={viewMode}
        onSelect={onFieldSelect}
      />

      <VideoRecorderPanel
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        stageRef={stageRef}
        elements={elements}
        setFrame={setFrameElements}
        keyframes={keyframes}
        setKeyframes={setKeyframes}
      />
    </Wrap>
  );
}
