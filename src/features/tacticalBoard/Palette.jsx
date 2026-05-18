/**
 * Palette — paleta horizontal inferior estilo misterdata SlidingPalette.
 * (port de field.js:14361)
 *
 * Click en un botón → setActiveTool(type). Materials-button despliega/repliega
 * la sub-paleta de materiales a la derecha.
 * Mantener pulsado (long-press) en ícono → abre panel de edición para cambiar
 * los valores por defecto de ese ícono de paleta (color, número, tamaño).
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import PaletteIcon from './PaletteIcon';
import { PRESET_COLORS } from './colorPalette';
import {
  PALETTE_PLAYERS,
  PALETTE_GROUPS,
  PALETTE_MATERIALS_BUTTON,
  PALETTE_LINES,
  MATERIALS_ICONS,
} from './icons';

const LONG_PRESS_MS = 500;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, rgba(35,55,75,0.95) 0%, rgba(20,35,50,0.95) 100%);
  border-radius: 14px;
  overflow-x: auto;
  overflow-y: visible;
  position: relative;
  min-height: 52px;
  box-sizing: border-box;

  @media (max-width: 900px) {
    padding-left: 8px;
    padding-right: 8px;
    min-height: 48px;
  }

  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
`;

const Sep = styled.div`
  width: 1px;
  height: 32px;
  background: rgba(255,255,255,0.18);
  margin: 0 4px;
  flex-shrink: 0;
`;

const Btn = styled.button`
  width: ${({ $size }) => $size || 44}px;
  height: ${({ $size }) => $size || 44}px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 2px solid ${({ $active }) => ($active ? '#fbbf24' : 'transparent')};
  background: ${({ $active }) => ($active ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)')};
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
  transition: background 0.12s, border 0.12s;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  &:hover { background: rgba(255,255,255,0.14); }
  &:active { background: rgba(255,255,255,0.2); }
`;

const SubPalette = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(0,0,0,0.55);
  border-radius: 10px;
  margin-left: 4px;
  flex-shrink: 0;
`;

const ColorPopover = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 12px;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
  z-index: 999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  min-width: 190px;
`;

const ColorSwatch = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: 2px solid ${({ $sel }) => ($sel ? '#fbbf24' : 'rgba(255,255,255,0.15)')};
  background: ${({ $color }) => $color};
  cursor: pointer;
  padding: 0;
  &:hover { border-color: rgba(255,255,255,0.5); }
`;

const PopoverTitle = styled.div`
  font-size: 11px;
  color: #cbd5e1;
  text-align: center;
  grid-column: 1 / -1;
  margin-bottom: 4px;
`;

export default function Palette({ activeTool, onSelectTool, paletteColors = {}, onPaletteColorChange, onLongPressPaletteItem }) {
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const popoverRef = useRef(null);
  const longPressTimer = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    const closeOnClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setColorPickerFor(null);
      }
    };
    if (colorPickerFor) {
      document.addEventListener('mousedown', closeOnClickOutside);
      return () => document.removeEventListener('mousedown', closeOnClickOutside);
    }
  }, [colorPickerFor]);

  const getEffectiveColor = (icon) => paletteColors[icon.id] || icon.color;

  const handlePointerDown = useCallback((icon) => {
    longPressTimer.current = setTimeout(() => {
      if (onLongPressPaletteItem) {
        onLongPressPaletteItem(icon);
      }
      longPressTimer.current = null;
    }, LONG_PRESS_MS);
  }, [onLongPressPaletteItem]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const renderBtn = (icon) => (
    <Btn
      key={icon.id}
      type="button"
      title={icon.label}
      $active={activeTool === icon.type}
      onClick={() => {
        if (icon.type === 'materials-button') { setMaterialsOpen((v) => !v); return; }
        onSelectTool(icon.type, icon);
        setMaterialsOpen(false);
      }}
      onPointerDown={() => handlePointerDown(icon)}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => {
        e.preventDefault();
        setColorPickerFor(icon.id);
      }}
      style={{ position: 'relative' }}
    >
      <PaletteIcon icon={{ ...icon, color: getEffectiveColor(icon) }} size={icon.type === 'goal-large' || icon.type === 'goal-small' ? 32 : 30} />
      {colorPickerFor === icon.id && (
        <ColorPopover ref={popoverRef} onClick={(e) => e.stopPropagation()}>
          <PopoverTitle>{t('tacticalBoard.paletteColor', 'Color de paleta')}</PopoverTitle>
          {PRESET_COLORS.map((c) => (
            <ColorSwatch
              key={c}
              type="button"
              $color={c}
              $sel={getEffectiveColor(icon) === c}
              onClick={() => {
                onPaletteColorChange(icon.id, c);
                setColorPickerFor(null);
              }}
            />
          ))}
        </ColorPopover>
      )}
    </Btn>
  );

  return (
    <Bar>
      {PALETTE_PLAYERS.map(renderBtn)}
      <Sep />
      {PALETTE_GROUPS.map(renderBtn)}
      <Sep />
      <Btn
        type="button"
        title={PALETTE_MATERIALS_BUTTON.label}
        $active={materialsOpen}
        onClick={() => setMaterialsOpen((v) => !v)}
        onPointerDown={() => handlePointerDown(PALETTE_MATERIALS_BUTTON)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => {
          e.preventDefault();
          setColorPickerFor(PALETTE_MATERIALS_BUTTON.id);
        }}
        style={{ position: 'relative' }}
      >
        <PaletteIcon icon={{ ...PALETTE_MATERIALS_BUTTON, color: getEffectiveColor(PALETTE_MATERIALS_BUTTON) }} size={30} />
        {colorPickerFor === PALETTE_MATERIALS_BUTTON.id && (
          <ColorPopover ref={popoverRef} onClick={(e) => e.stopPropagation()}>
            <PopoverTitle>{t('tacticalBoard.paletteColor', 'Color de paleta')}</PopoverTitle>
            {PRESET_COLORS.map((c) => (
              <ColorSwatch key={c} type="button" $color={c} $sel={getEffectiveColor(PALETTE_MATERIALS_BUTTON) === c}
                onClick={() => { onPaletteColorChange(PALETTE_MATERIALS_BUTTON.id, c); setColorPickerFor(null); }} />
            ))}
          </ColorPopover>
        )}
      </Btn>
      {materialsOpen && (
        <SubPalette>
          {MATERIALS_ICONS.map(renderBtn)}
        </SubPalette>
      )}
      <Sep />
      {PALETTE_LINES.map(renderBtn)}
      <Sep />
      {renderBtn({ id: 'text', type: 'text', label: 'Texto', color: '#ffffff' })}
      {renderBtn({ id: 'connector', type: 'connector', label: 'Conectar iconos', color: '#ffffff' })}
      {renderBtn({ id: 'eraser', type: 'eraser', label: 'Borrador', color: '#ffffff' })}
    </Bar>
  );
}
