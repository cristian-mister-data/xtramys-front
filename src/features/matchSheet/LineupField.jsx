import styled from 'styled-components';
import { POSITION_COLORS } from './formations';

// Read-only field renderer + slot helpers
// Used both inside LineupEditor (interactive) and in detail/PDF (static).

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 100 / 142;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  background: #2f7a2f;
  user-select: none;
`;

const Field = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
`;

export function FieldBackground() {
  // 14 horizontal stripes alternating greens
  const stripes = [];
  for (let i = 0; i < 14; i++) {
    stripes.push(
      <rect
        key={i}
        x="0"
        y={(i * 142) / 14}
        width="100"
        height={142 / 14}
        fill={i % 2 === 0 ? '#3a8a3a' : '#2f7a2f'}
      />
    );
  }
  return (
    <>
      {stripes}
      {/* Outer border */}
      <rect x="0.4" y="0.4" width="99.2" height="141.2" fill="none" stroke="#fff" strokeWidth="0.4" />
      {/* Halfway line */}
      <line x1="0" y1="71" x2="100" y2="71" stroke="#fff" strokeWidth="0.4" />
      {/* Center circle */}
      <circle cx="50" cy="71" r="13.5" fill="none" stroke="#fff" strokeWidth="0.4" />
      <circle cx="50" cy="71" r="0.7" fill="#fff" />
      {/* Top penalty box */}
      <rect x="22.5" y="0" width="55" height="15.5" fill="none" stroke="#fff" strokeWidth="0.4" />
      <rect x="38" y="0" width="24" height="5.5" fill="none" stroke="#fff" strokeWidth="0.4" />
      <circle cx="50" cy="10" r="0.5" fill="#fff" />
      <path d="M 40.85 10 A 9.15 9.15 0 0 0 59.15 10" fill="none" stroke="#fff" strokeWidth="0.4" />
      {/* Bottom penalty box */}
      <rect x="22.5" y="126.5" width="55" height="15.5" fill="none" stroke="#fff" strokeWidth="0.4" />
      <rect x="38" y="136.5" width="24" height="5.5" fill="none" stroke="#fff" strokeWidth="0.4" />
      <circle cx="50" cy="132" r="0.5" fill="#fff" />
      <path d="M 40.85 132 A 9.15 9.15 0 0 1 59.15 132" fill="none" stroke="#fff" strokeWidth="0.4" />
    </>
  );
}

const SlotBase = styled.button`
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  pointer-events: ${({ $clickable }) => ($clickable ? 'auto' : 'none')};
`;

const Circle = styled.div`
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color, $empty }) =>
    $empty
      ? 'rgba(255,255,255,0.18)'
      : `linear-gradient(135deg, ${$color}, ${$color}cc)`};
  border: 3px solid ${({ $color, $selected }) => ($selected ? '#fde047' : $color)};
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  overflow: hidden;
  position: relative;
`;

const Photo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

const NameTag = styled.div`
  margin-top: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: rgba(0,0,0,0.6);
  padding: 1px 6px;
  border-radius: 6px;
  max-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export function PlayerSlot({
  slot,
  player,
  size = 44,
  selected = false,
  clickable = false,
  onClick,
}) {
  const color = POSITION_COLORS[slot.pos] || '#3b82f6';
  const empty = !player;
  const firstName = player ? (player.nombre || '').split(' ')[0] : '';
  return (
    <SlotBase
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: size }}
      $clickable={clickable}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <Circle $color={color} $empty={empty} $selected={selected}>
        {player?.foto ? (
          <Photo src={player.foto} alt={firstName} />
        ) : (
          <span>{empty ? slot.label : (player?.dorsal ?? '?')}</span>
        )}
      </Circle>
      {player ? <NameTag>{firstName || '—'}</NameTag> : null}
    </SlotBase>
  );
}

export default function LineupField({ slots, players = [], starterIds = [], slotSize = 44, onSlotClick, selectedPlayerId }) {
  return (
    <Wrapper>
      <Field viewBox="0 0 100 142" preserveAspectRatio="none">
        <FieldBackground />
      </Field>
      {slots.map((slot, idx) => {
        const playerId = starterIds[idx] || null;
        const player = playerId ? players.find((p) => p._id === playerId) : null;
        return (
          <PlayerSlot
            key={`${slot.pos}-${idx}`}
            slot={slot}
            player={player}
            size={slotSize}
            selected={selectedPlayerId && playerId === selectedPlayerId}
            clickable={Boolean(onSlotClick)}
            onClick={() => onSlotClick?.(idx, playerId)}
          />
        );
      })}
    </Wrapper>
  );
}
