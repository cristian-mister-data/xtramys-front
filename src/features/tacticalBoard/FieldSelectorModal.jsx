import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import { Row, Muted } from '@/ui/primitives';
import { LINE_TYPES } from './fieldDimensions';
import FieldSVGRenderer from './FieldSVGRenderer';
import { getAspectForView } from './fieldConfigs';

const VIEW_OPTIONS = ['entire', 'halfLeft', 'halfRight', 'halfUp', 'halfDown'];
const PREVIEW_W = 160;

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  margin: 8px 0 6px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const Card = styled.button`
  border: 2px solid ${({ $sel }) => ($sel ? '#1a237e' : '#e2e8f0')};
  background: ${({ $sel }) => ($sel ? '#eff6ff' : '#fff')};
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
`;

const PreviewBox = styled.div`
  width: ${PREVIEW_W}px;
  height: ${({ $h }) => $h}px;
  border-radius: 4px;
  overflow: hidden;
  background: #4a8c3f;
`;

function Preview({ lineType, viewMode }) {
  const aspect = getAspectForView(viewMode);
  const h = Math.round(PREVIEW_W * aspect);
  return (
    <PreviewBox $h={h}>
      <FieldSVGRenderer lineType={lineType} viewMode={viewMode} width={PREVIEW_W} height={h} />
    </PreviewBox>
  );
}

export default function FieldSelectorModal({ open, onClose, lineType, viewMode, onSelect }) {
  const { t } = useTranslation();

  const pick = (lt, vm) => {
    onSelect?.(lt, vm);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('tacticalBoard.selectField', 'Seleccionar campo')}
      width={640}
    >
      <Muted>{t('tacticalBoard.selectFieldHelp', 'Elige el tipo de líneas y la vista del campo.')}</Muted>

      <SectionTitle>{t('tacticalBoard.lineType', 'Tipo de líneas')}</SectionTitle>
      <Grid>
        {LINE_TYPES.map((lt) => (
          <Card key={lt} type="button" $sel={lt === lineType} onClick={() => pick(lt, viewMode)}>
            <Preview lineType={lt} viewMode={viewMode} />
            {lt}
          </Card>
        ))}
      </Grid>

      <SectionTitle>{t('tacticalBoard.viewMode', 'Vista')}</SectionTitle>
      <Row $gap={10} $wrap style={{ flexWrap: 'wrap' }}>
        {VIEW_OPTIONS.map((vm) => (
          <Card
            key={vm}
            type="button"
            $sel={vm === viewMode}
            onClick={() => pick(lineType, vm)}
            style={{ width: 180 }}
          >
            <Preview lineType={lineType} viewMode={vm} />
            {vm}
          </Card>
        ))}
      </Row>
    </Modal>
  );
}
