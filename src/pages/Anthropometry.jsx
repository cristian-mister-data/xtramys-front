import { useTranslation } from 'react-i18next';
import { MdAccessibility, MdAdd } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import AnthropometryView from '@/vendor/anthropometry/anthropometry';
import { Button, Row } from '@/ui/primitives';

export default function Anthropometry() {
  const { t } = useTranslation();

  return (
    <RNWebPage
      themed
      title={t('sectionHeaders.anthropometryTitle', 'Pliegues y Pesos')}
      subtitle={t('sectionHeaders.anthropometry', 'Controla mediciones corporales, filtros por jugador y evolución física.')}
      icon={MdAccessibility}
      actions={(
        <Button $variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('anthropometry:create'))}>
          <Row $gap={6}>
            <MdAdd size={18} />
            {t('anthropometry.newMeasurement', 'Nueva medición')}
          </Row>
        </Button>
      )}
    >
      <AnthropometryView />
    </RNWebPage>
  );
}

