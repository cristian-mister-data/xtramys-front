import { useTranslation } from 'react-i18next';
import { MdDescription, MdAdd } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import MatchSheetList from '@/vendor/matchSheet/matchSheetList';
import { Button, Row } from '@/ui/primitives';

export default function MatchSheets() {
  const { t } = useTranslation();

  return (
    <RNWebPage
      themed
      title={t('menu.matchSheets', 'Fichas de Partido')}
      subtitle={t('sectionHeaders.matchSheets', 'Prepara convocatorias, alineaciones y registros de cada encuentro.')}
      icon={MdDescription}
      actions={(
        <Button $variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('matchsheets:create'))}>
          <Row $gap={6}>
            <MdAdd size={18} />
            {t('matchSheet.actions.createMatchSheet', 'Crear ficha')}
          </Row>
        </Button>
      )}
    >
      <MatchSheetList />
    </RNWebPage>
  );
}

