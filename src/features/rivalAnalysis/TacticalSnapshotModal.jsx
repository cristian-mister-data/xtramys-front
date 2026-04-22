// Modal que envuelve la pizarra táctica y devuelve un snapshot (base64 PNG)
// junto con el estado de jugadores/líneas. Usado por las preguntas de tipo
// "graphic" en el formulario de RivalAnalysis.
import Modal from '@/ui/Modal';
import TacticalBoard from '@/features/tacticalBoard/TacticalBoard';

export default function TacticalSnapshotModal({
  open,
  onClose,
  onSave,
  initialPlayers,
  initialFieldType = 'full',
  title = 'Pizarra táctica',
}) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} width={1100}>
      <TacticalBoard
        initialPlayers={initialPlayers}
        initialLineType={initialFieldType}
        onSave={(payload) => {
          onSave?.(payload);
          onClose?.();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
