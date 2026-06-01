import { useTranslation } from 'react-i18next';
import { MdDescription, MdAdd } from 'react-icons/md';
import { useSelector } from 'react-redux';
import RNWebPage from './_RNWebPage';
import MatchSheetList from '@/vendor/matchSheet/matchSheetList';
import TeamRequiredCard from '@/components/shared/TeamRequiredCard';
import { Button, Row } from '@/ui/primitives';

export default function MatchSheets() {
  const { t } = useTranslation();
  const teams = useSelector((s) => s.team?.teams ?? []);
  const selectedTeam = teams.find((e) => e.seleccionado) || null;

  return (
    <RNWebPage
      themed
      title={t('menu.matchSheets', 'Fichas de Partido')}
      subtitle={t('sectionHeaders.matchSheets', 'Prepara convocatorias, alineaciones y registros de cada encuentro.')}
      icon={MdDescription}
      actions={selectedTeam ? (
        <Button $variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('matchsheets:create'))}>
          <Row $gap={6}>
            <MdAdd size={18} />
            {t('matchSheet.actions.createMatchSheet', 'Crear ficha')}
          </Row>
        </Button>
      ) : null}
    >
      {selectedTeam ? <MatchSheetList /> : <TeamRequiredCard />}
    </RNWebPage>
  );
}

