/**
 * Palette — paleta horizontal inferior estilo misterdata SlidingPalette.
 * (port de field.js:14361)
 *
 * Click en un botón → setActiveTool(type). Materials-button despliega/repliega
 * la sub-paleta de materiales a la derecha.
 */
import { useState } from 'react';
import styled from 'styled-components';
import PaletteIcon from './PaletteIcon';
import {
  PALETTE_PLAYERS,
  PALETTE_GROUPS,
  PALETTE_MATERIALS_BUTTON,
  PALETTE_LINES,
  MATERIALS_ICONS,
} from './icons';

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: linear-gradient(180deg, rgba(35,55,75,0.95) 0%, rgba(20,35,50,0.95) 100%);
  border-radius: 14px;
  overflow-x: auto;
  overflow-y: visible;
  position: relative;

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
  &:hover { background: rgba(255,255,255,0.14); }
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

export default function Palette({ activeTool, onSelectTool }) {
  const [materialsOpen, setMaterialsOpen] = useState(false);

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
    >
      <PaletteIcon icon={icon} size={icon.type === 'goal-large' || icon.type === 'goal-small' ? 32 : 30} />
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
      >
        <PaletteIcon icon={PALETTE_MATERIALS_BUTTON} size={30} />
      </Btn>
      {materialsOpen && (
        <SubPalette>
          {MATERIALS_ICONS.map(renderBtn)}
        </SubPalette>
      )}
      <Sep />
      {PALETTE_LINES.map(renderBtn)}
      <Sep />
      {renderBtn({ id: 'text', type: 'text', label: 'Texto' })}
      {renderBtn({ id: 'connector', type: 'connector', label: 'Conectar iconos' })}
      {renderBtn({ id: 'eraser', type: 'eraser', label: 'Borrador' })}
    </Bar>
  );
}
