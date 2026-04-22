/**
 * LeftEditPanel — Port simplificado de misterdata field.js:2619 LeftEditPanel.
 *
 * Panel lateral derecho que aparece cuando hay un elemento seleccionado.
 * Permite editar propiedades comunes (color, tamaño, número, grosor, dashed,
 * rotación) según el tipo del elemento.
 */
import styled from 'styled-components';
import { MdClose, MdRotateRight, MdRotateLeft } from 'react-icons/md';
import { PRESET_COLORS } from './colorPalette';
import { MATERIAL_TYPES_SET } from './icons';

const Panel = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 240px;
  background: linear-gradient(180deg, rgba(35,55,75,0.97), rgba(20,35,50,0.97));
  border-left: 1px solid rgba(255,255,255,0.08);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 5;
  color: #f1f5f9;
  overflow-y: auto;
  box-shadow: -6px 0 20px rgba(0,0,0,0.35);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const CloseBtn = styled.button`
  width: 28px;
  height: 28px;
  background: rgba(255,255,255,0.08);
  border: 0;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255,255,255,0.18); }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #cbd5e1;
`;

const Swatches = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
`;

const Swatch = styled.button`
  aspect-ratio: 1;
  border-radius: 5px;
  border: 2px solid ${({ $active }) => ($active ? '#fbbf24' : 'rgba(255,255,255,0.15)')};
  background: ${({ $color }) => $color};
  cursor: pointer;
  padding: 0;
  &:hover { border-color: rgba(255,255,255,0.4); }
`;

const NumberInput = styled.input`
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
  width: 100%;
`;

const Slider = styled.input.attrs({ type: 'range' })`
  width: 100%;
`;

const Row = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const ToggleBtn = styled.button`
  flex: 1;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => ($active ? '#fbbf24' : 'rgba(255,255,255,0.15)')};
  background: ${({ $active }) => ($active ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.06)')};
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.14); }
`;

const IconBtn = styled.button`
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255,255,255,0.18); }
`;

const DangerBtn = styled.button`
  margin-top: auto;
  padding: 8px;
  border-radius: 6px;
  border: 0;
  background: #ef4444;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #dc2626; }
`;

const SHAPE_TYPES = new Set(['line', 'curve', 'rect', 'circle']);
const ROTATABLE = new Set(['goal-large', 'goal-small', 'barrier', 'dummy', 'pole', 'ladder']);

export default function LeftEditPanel({ element, onChange, onDelete, onClose }) {
  if (!element) return null;
  const el = element;
  const isPlayer = el.type === 'player';
  const isShape = SHAPE_TYPES.has(el.type);
  const isRotatable = ROTATABLE.has(el.type);
  const isMaterial = MATERIAL_TYPES_SET.has(el.type);

  const update = (patch) => onChange({ ...el, ...patch });

  const rotate = (delta) => update({ rotation: ((el.rotation || 0) + delta + 360) % 360 });

  return (
    <Panel onClick={(e) => e.stopPropagation()}>
      <Header>
        <span>Editar {el.type}</span>
        <CloseBtn type="button" onClick={onClose}><MdClose /></CloseBtn>
      </Header>

      {/* Color (jugadores, materiales, formas) */}
      {(isPlayer || isMaterial || isShape) && (
        <Field>
          <Label>Color</Label>
          <Swatches>
            {PRESET_COLORS.map((c) => (
              <Swatch key={c} type="button" $color={c} $active={el.color === c}
                onClick={() => update({ color: c })} title={c} />
            ))}
          </Swatches>
        </Field>
      )}

      {/* Número (jugadores) */}
      {isPlayer && (
        <Field>
          <Label>Número</Label>
          <NumberInput
            type="text"
            value={el.number ?? ''}
            onChange={(e) => update({ number: e.target.value })}
            maxLength={3}
          />
        </Field>
      )}

      {/* Portero toggle (jugadores) */}
      {isPlayer && (
        <Field>
          <Label>Tipo</Label>
          <Row>
            <ToggleBtn type="button" $active={!el.isGoalkeeper} onClick={() => update({ isGoalkeeper: false })}>
              Jugador
            </ToggleBtn>
            <ToggleBtn type="button" $active={!!el.isGoalkeeper} onClick={() => update({ isGoalkeeper: true })}>
              Portero
            </ToggleBtn>
          </Row>
        </Field>
      )}

      {/* Tamaño (iconos) */}
      {(isPlayer || isMaterial) && (
        <Field>
          <Label>Tamaño: {el.size || 24}</Label>
          <Slider min={12} max={64} step={1} value={el.size || 24}
            onChange={(e) => update({ size: Number(e.target.value) })} />
        </Field>
      )}

      {/* Rotación (rotables) */}
      {isRotatable && (
        <Field>
          <Label>Rotación: {el.rotation || 0}°</Label>
          <Row>
            <IconBtn type="button" onClick={() => rotate(-15)}><MdRotateLeft /></IconBtn>
            <Slider min={0} max={359} step={1} value={el.rotation || 0}
              onChange={(e) => update({ rotation: Number(e.target.value) })} />
            <IconBtn type="button" onClick={() => rotate(15)}><MdRotateRight /></IconBtn>
          </Row>
        </Field>
      )}

      {/* Grosor + dashed + flecha (formas) */}
      {isShape && (
        <>
          <Field>
            <Label>Grosor: {Math.round((el.thickness || 0.004) * 1000) / 10}</Label>
            <Slider min={0.001} max={0.012} step={0.0005} value={el.thickness || 0.004}
              onChange={(e) => update({ thickness: Number(e.target.value) })} />
          </Field>
          <Field>
            <Label>Estilo</Label>
            <Row>
              <ToggleBtn type="button" $active={!el.dashed} onClick={() => update({ dashed: false })}>Sólida</ToggleBtn>
              <ToggleBtn type="button" $active={!!el.dashed} onClick={() => update({ dashed: true })}>Discontinua</ToggleBtn>
            </Row>
          </Field>
          {(el.type === 'line' || el.type === 'curve') && (
            <Field>
              <Label>Punta</Label>
              <Row>
                <ToggleBtn type="button" $active={!el.arrow} onClick={() => update({ arrow: false })}>Sin flecha</ToggleBtn>
                <ToggleBtn type="button" $active={!!el.arrow} onClick={() => update({ arrow: true })}>Flecha</ToggleBtn>
              </Row>
            </Field>
          )}
        </>
      )}

      {/* Texto */}
      {el.type === 'text' && (
        <>
          <Field>
            <Label>Texto</Label>
            <NumberInput value={el.text || ''} onChange={(e) => update({ text: e.target.value })} />
          </Field>
          <Field>
            <Label>Tamaño: {Math.round((el.fontSize || 0.03) * 1000) / 10}</Label>
            <Slider min={0.015} max={0.08} step={0.002} value={el.fontSize || 0.03}
              onChange={(e) => update({ fontSize: Number(e.target.value) })} />
          </Field>
          <Field>
            <Label>Color</Label>
            <Swatches>
              {PRESET_COLORS.map((c) => (
                <Swatch key={c} type="button" $color={c} $active={el.color === c}
                  onClick={() => update({ color: c })} />
              ))}
            </Swatches>
          </Field>
        </>
      )}

      <DangerBtn type="button" onClick={onDelete}>Eliminar elemento</DangerBtn>
    </Panel>
  );
}
