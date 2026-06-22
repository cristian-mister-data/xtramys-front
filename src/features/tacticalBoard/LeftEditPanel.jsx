/**
 * LeftEditPanel — Port simplificado de misterdata field.js:2619 LeftEditPanel.
 *
 * Panel lateral derecho que aparece cuando hay un elemento seleccionado.
 * Permite editar propiedades comunes (color, tamaño, número, grosor, dashed,
 * rotación) según el tipo del elemento.
 */
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
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
  border: 2px solid ${({ $active }) => ($active ? '#fbbf24' : '#000')};
  background: ${({ $color }) => $color};
  cursor: pointer;
  padding: 0;
  &:hover { border-color: ${({ $active }) => ($active ? '#fbbf24' : '#111')}; }
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

const TextAreaInput = styled.textarea`
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
  width: 100%;
  min-height: 72px;
  resize: vertical;
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

export default function LeftEditPanel({ element, onChange, onDelete, onClose, isPaletteItem = false }) {
  const { t } = useTranslation();
  if (!element) return null;
  const el = element;
  const isPlayer = el.type === 'player';
  const isShape = SHAPE_TYPES.has(el.type);
  const isRotatable = ROTATABLE.has(el.type);
  const isMaterial = MATERIAL_TYPES_SET.has(el.type);

  const update = (patch) => onChange({ ...el, ...patch });

  const rotate = (delta) => update({ rotation: ((el.rotation || 0) + delta + 360) % 360 });

  const typeLabelMap = {
    player: t('tacticalBoard.editPanel.editPlayer', 'Jugador'),
    'goal-large': t('tacticalBoard.editPanel.editBigGoal', 'Portería grande'),
    'goal-small': t('tacticalBoard.editPanel.editSmallGoal', 'Portería pequeña'),
    barrier: t('tacticalBoard.editPanel.editBarrier', 'Barrera'),
    dummy: t('tacticalBoard.editPanel.editDummy', 'Maniquí'),
    pole: t('tacticalBoard.editPanel.editPole', 'Palo'),
    ladder: t('tacticalBoard.editPanel.editLadder', 'Escalera'),
    ball: t('tacticalBoard.editPanel.editBall', 'Balón'),
    'custom-shape-button': t('tacticalBoard.editPanel.editCustomShapeButton', 'Figura personalizada'),
    cone: t('tacticalBoard.editPanel.editCone', 'Cono'),
    'cone-flat': t('tacticalBoard.editPanel.editConeFlat', 'Cono bajo'),
    ring: t('tacticalBoard.editPanel.editRing', 'Aro'),
    line: t('tacticalBoard.editPanel.editLine', 'Línea'),
    curve: t('tacticalBoard.editPanel.editCurve', 'Curva'),
    rect: t('tacticalBoard.editPanel.editRect', 'Rectángulo'),
    circle: t('tacticalBoard.editPanel.editCircle', 'Círculo'),
    text: t('tacticalBoard.editPanel.editText', 'Texto'),
    connector: t('tacticalBoard.editPanel.editConnector', 'Conector'),
    'team-players': t('tacticalBoard.icons.teamPlayers', 'Jugadores de plantilla'),
    'coaching-staff': t('tacticalBoard.icons.coachingStaff', 'Cuerpo técnico'),
    'materials-button': t('tacticalBoard.icons.materials', 'Materiales'),
  };
  const baseLabel = typeLabelMap[el.type] || el.type;
  const editLabel = isPaletteItem
    ? `${t('tacticalBoard.editPanel.editingPalette', 'Paleta')} — ${baseLabel}`
    : (typeLabelMap[el.type] || `${t('common.edit', 'Editar')} ${el.type}`);

  return (
    <Panel onClick={(e) => e.stopPropagation()}>
      <Header>
        <span>{editLabel}</span>
        <CloseBtn type="button" onClick={onClose}><MdClose /></CloseBtn>
      </Header>

      {/* Color (jugadores, materiales, formas) */}
      {(isPlayer || isMaterial || isShape) && (
        <Field>
          <Label>{t('tacticalBoard.editPanel.color', 'Color')}</Label>
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
          <Label>{t('tacticalBoard.editPanel.number', 'Número')}</Label>
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
          <Label>{t('tacticalBoard.editPanel.type', 'Tipo')}</Label>
          <Row>
            <ToggleBtn type="button" $active={!el.isGoalkeeper} onClick={() => update({ isGoalkeeper: false })}>
              {t('tacticalBoard.editPanel.fieldPlayer', 'Jugador')}
            </ToggleBtn>
            <ToggleBtn type="button" $active={!!el.isGoalkeeper} onClick={() => update({ isGoalkeeper: true })}>
              {t('tacticalBoard.editPanel.goalkeeper', 'Portero')}
            </ToggleBtn>
          </Row>
        </Field>
      )}

      {/* Forma (jugadores) */}
      {isPlayer && (
        <Field>
          <Label>{t('tacticalBoard.editPanel.shape', 'Forma')}</Label>
          <Row>
            <ToggleBtn type="button" $active={el.shape !== 'jersey'} onClick={() => update({ shape: 'circle' })}>
              {t('tacticalBoard.editPanel.shapeCircle', 'Círculo')}
            </ToggleBtn>
            <ToggleBtn type="button" $active={el.shape === 'jersey'} onClick={() => update({ shape: 'jersey' })}>
              {t('tacticalBoard.editPanel.shapeJersey', 'Camiseta')}
            </ToggleBtn>
          </Row>
        </Field>
      )}

      {/* Rayas (jugadores) */}
      {isPlayer && !el.isGoalkeeper && (
        <Field>
          <Label>{t('tacticalBoard.editPanel.stripes', 'Rayas')}</Label>
          <Row>
            <ToggleBtn type="button" $active={!el.hasStripes} onClick={() => update({ hasStripes: false })}>
              {t('tacticalBoard.editPanel.no', 'No')}
            </ToggleBtn>
            <ToggleBtn type="button" $active={!!el.hasStripes} onClick={() => update({ hasStripes: true })}>
              {t('tacticalBoard.editPanel.yes', 'Sí')}
            </ToggleBtn>
          </Row>
        </Field>
      )}

      {/* Color de rayas (jugadores no porteros con rayas) */}
      {isPlayer && !el.isGoalkeeper && el.hasStripes && (
        <Field>
          <Label>{t('tacticalBoard.editPanel.stripeColor', 'Color de rayas')}</Label>
          <Swatches>
            {PRESET_COLORS.map((c) => (
              <Swatch key={c} type="button" $color={c} $active={(el.stripeColor || '#ffffff') === c}
                onClick={() => update({ stripeColor: c })} title={c} />
            ))}
          </Swatches>
        </Field>
      )}


      {/* Trayectoria (balón) */}
      {el.type === 'ball' && (
        <Field>
          <Label>{t('tacticalBoard.editPanel.trajectory', 'Trayectoria')}</Label>
          <Row>
            <ToggleBtn
              type="button"
              $active={!el.trajectory || el.trajectory === 'ground'}
              onClick={() => update({ trajectory: 'ground' })}
              style={(!el.trajectory || el.trajectory === 'ground') ? { borderColor: '#4CAF50', background: 'rgba(76,175,80,0.18)' } : {}}
            >
              <span style={{ fontSize: 14, marginRight: 4 }}>➡</span>
              {t('tacticalBoard.editPanel.ground', 'Suelo')}
            </ToggleBtn>
            <ToggleBtn
              type="button"
              $active={el.trajectory === 'air'}
              onClick={() => update({ trajectory: 'air' })}
              style={el.trajectory === 'air' ? { borderColor: '#f59e0b', background: 'rgba(245,158,11,0.18)' } : {}}
            >
              <span style={{ fontSize: 14, marginRight: 4 }}>↗</span>
              {t('tacticalBoard.editPanel.air', 'Aire')}
            </ToggleBtn>
          </Row>
        </Field>
      )}

      {/* Tamaño (iconos) */}
      {(isPlayer || isMaterial) && (
        <Field>
          <Label>{t('tacticalBoard.editPanel.size', 'Tamaño')}: {el.size || 24}</Label>
          <Slider min={12} max={64} step={1} value={el.size || 24}
            onChange={(e) => update({ size: Number(e.target.value) })} />
        </Field>
      )}

      {/* Rotación (rotables) */}
      {isRotatable && (
        <Field>
          <Label>{t('tacticalBoard.editPanel.rotation', 'Rotación')}: {el.rotation || 0}°</Label>
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
            <Label>{t('tacticalBoard.editPanel.thickness', 'Grosor')}: {Math.round((el.thickness || 0.004) * 1000) / 10}</Label>
            <Slider min={0.001} max={0.012} step={0.0005} value={el.thickness || 0.004}
              onChange={(e) => update({ thickness: Number(e.target.value) })} />
          </Field>
          <Field>
            <Label>{t('tacticalBoard.editPanel.style', 'Estilo')}</Label>
            <Row>
              <ToggleBtn type="button" $active={!el.dashed} onClick={() => update({ dashed: false })}>{t('tacticalBoard.editPanel.solid', 'Sólida')}</ToggleBtn>
              <ToggleBtn type="button" $active={!!el.dashed} onClick={() => update({ dashed: true })}>{t('tacticalBoard.editPanel.dashed', 'Discontinua')}</ToggleBtn>
            </Row>
          </Field>
          {(el.type === 'line' || el.type === 'curve') && (
            <Field>
              <Label>{t('tacticalBoard.editPanel.tip', 'Punta')}</Label>
              <Row>
                <ToggleBtn type="button" $active={!el.arrow} onClick={() => update({ arrow: false })}>{t('tacticalBoard.editPanel.noArrow', 'Sin flecha')}</ToggleBtn>
                <ToggleBtn type="button" $active={!!el.arrow} onClick={() => update({ arrow: true })}>{t('tacticalBoard.editPanel.arrow', 'Flecha')}</ToggleBtn>
              </Row>
            </Field>
          )}
        </>
      )}

      {/* Texto */}
      {el.type === 'text' && (
        <>
          <Field>
            <Label>{t('tacticalBoard.editPanel.text', 'Texto')}</Label>
            <TextAreaInput value={el.text || ''} onChange={(e) => update({ text: e.target.value.replace(/\r\n/g, '\n') })} />
          </Field>
          <Field>
            <Label>{t('tacticalBoard.editPanel.size', 'Tamaño')}: {Math.round((el.fontSize || 0.03) * 1000) / 10}</Label>
            <Slider min={0.015} max={0.08} step={0.002} value={el.fontSize || 0.03}
              onChange={(e) => update({ fontSize: Number(e.target.value) })} />
          </Field>
          <Field>
            <Label>{t('tacticalBoard.editPanel.color', 'Color')}</Label>
            <Swatches>
              {PRESET_COLORS.map((c) => (
                <Swatch key={c} type="button" $color={c} $active={el.color === c}
                  onClick={() => update({ color: c })} />
              ))}
            </Swatches>
          </Field>
        </>
      )}

      {!isPaletteItem && onDelete && (
        <DangerBtn type="button" onClick={onDelete}>{t('tacticalBoard.editPanel.delete', 'Eliminar elemento')}</DangerBtn>
      )}
    </Panel>
  );
}
