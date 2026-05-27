/**
 * Toolbar de la pizarra táctica — barra superior de SISTEMA.
 *
 * Tras la migración a Palette inferior (estilo SlidingPalette de misterdata),
 * esta toolbar aloja los botones de sistema: vídeo (primero, siempre a mano),
 * select/eraser, color, dashed, undo/redo, delete, formación, campo y guardar.
 *
 * Las herramientas de colocación de iconos (jugadores, materiales, líneas,
 * formas, texto) viven ahora en `Palette.jsx` debajo del campo.
 */
import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import {
  MdOutlineNearMe, MdDelete,
  MdUndo, MdRedo, MdPalette, MdSave, MdVideocam, MdStop,
  MdGridOn, MdAutoFixOff,
} from 'react-icons/md';
import ColorPickerPopover from './ColorPickerPopover';

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  row-gap: 8px;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};

  @media (max-width: 1280px) {
    padding: 8px 8px;
  }
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 6px;
  &:not(:last-child) {
    border-right: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const IconBtn = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => ($active ? '#1a237e' : 'transparent')};
  background: ${({ $active }) => ($active ? '#eff6ff' : 'transparent')};
  color: ${({ $active, $color }) => $color || ($active ? '#1a237e' : '#334155')};
  cursor: pointer;
  font-size: 18px;
  transition: background 0.1s, border 0.1s;

  &:hover:not(:disabled) { background: ${({ $active }) => ($active ? '#dbeafe' : '#f1f5f9')}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const TextBtn = styled.button`
  height: 36px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  &:hover:not(:disabled) { background: #f1f5f9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PrimaryBtn = styled(TextBtn)`
  background: #1a237e;
  border-color: #1a237e;
  color: #fff;
  &:hover:not(:disabled) { background: #303f9f; }
`;

const DangerBtn = styled(TextBtn)`
  background: #ef4444;
  border-color: #ef4444;
  color: #fff;
  &:hover:not(:disabled) { background: #dc2626; }
`;

const Swatch = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 2px solid #e2e8f0;
  background: ${({ $color }) => $color};
  cursor: pointer;
  padding: 0;
  position: relative;
`;

const ColorWrap = styled.div`
  position: relative;
`;

const Spacer = styled.div`
  flex: 1;
`;

export default function TacticalToolbar({
  activeTool,
  onToolChange,
  color,
  onColorChange,
  lineDashed,
  onToggleDashed,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
  onDeleteSelected,
  hasSelection,
  onOpenFormation,
  onOpenFieldSelector,
  onSave,
  onOpenRecorder,
  isRecording,
  saveLabel = 'Guardar',
}) {
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef(null);

  useEffect(() => {
    if (!colorOpen) return undefined;
    const close = (e) => {
      if (colorRef.current && !colorRef.current.contains(e.target)) setColorOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [colorOpen]);

  return (
    <Bar>
      <Group>
        {isRecording ? (
          <DangerBtn type="button" onClick={onOpenRecorder}>
            <MdStop /> Grabando…
          </DangerBtn>
        ) : (
          <TextBtn type="button" onClick={onOpenRecorder} title="Grabar animación (vídeo)">
            <MdVideocam /> Vídeo
          </TextBtn>
        )}
      </Group>

      <Group>
        <IconBtn type="button" title="Seleccionar"
          $active={activeTool === 'select'}
          onClick={() => onToolChange('select')}>
          <MdOutlineNearMe />
        </IconBtn>
        <IconBtn type="button" title="Borrador (haz click sobre un elemento)"
          $active={activeTool === 'eraser'}
          onClick={() => onToolChange('eraser')}
          $color="#ef4444">
          <MdAutoFixOff />
        </IconBtn>
      </Group>

      <Group>
        <ColorWrap ref={colorRef}>
          <Swatch
            type="button"
            title="Color de líneas/texto"
            $color={color}
            onClick={() => setColorOpen((v) => !v)}
          >
            <MdPalette style={{ color: '#fff', mixBlendMode: 'difference', position: 'absolute', top: 6, left: 6, fontSize: 14 }} />
          </Swatch>
          {colorOpen && (
            <ColorPickerPopover
              value={color}
              onChange={onColorChange}
              onClose={() => setColorOpen(false)}
            />
          )}
        </ColorWrap>
        <IconBtn
          type="button"
          title="Línea discontinua"
          $active={lineDashed}
          onClick={onToggleDashed}
        >
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: -1 }}>---</span>
        </IconBtn>
      </Group>

      <Group>
        <IconBtn type="button" title="Deshacer (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}><MdUndo /></IconBtn>
        <IconBtn type="button" title="Rehacer (Ctrl+Y)" disabled={!canRedo} onClick={onRedo}><MdRedo /></IconBtn>
        <IconBtn
          type="button"
          title="Borrar seleccionado (Supr)"
          disabled={!hasSelection}
          onClick={onDeleteSelected}
          $color="#ef4444"
        >
          <MdDelete />
        </IconBtn>
      </Group>

      <Group>
        <TextBtn type="button" onClick={onOpenFormation}>
          <MdGridOn /> Formación
        </TextBtn>
        <TextBtn type="button" onClick={onOpenFieldSelector}>
          <MdGridOn /> Campo
        </TextBtn>
        <TextBtn type="button" onClick={onClear}>
          Limpiar
        </TextBtn>
      </Group>

      <Spacer />

      <Group>
        {onSave && (
          <PrimaryBtn type="button" onClick={onSave}>
            <MdSave /> {saveLabel}
          </PrimaryBtn>
        )}
      </Group>
    </Bar>
  );
}
