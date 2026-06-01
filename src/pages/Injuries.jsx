import { useTranslation } from 'react-i18next';
import { MdMedicalServices, MdAdd } from 'react-icons/md';
import { useSelector } from 'react-redux';
import RNWebPage from './_RNWebPage';
import InjuriesManagement from '@/vendor/injuries/injuries';
import TeamRequiredCard from '@/components/shared/TeamRequiredCard';
import { Button, Row } from '@/ui/primitives';

export default function Injuries() {
  const { t } = useTranslation();
  const teams = useSelector((s) => s.team?.teams ?? []);
  const selectedTeam = teams.find((e) => e.seleccionado) || null;

  return (
    <RNWebPage
      themed
      title={t('menu.injuries', 'Lesiones')}
      subtitle={t('sectionHeaders.injuries', 'Registra lesiones, evolución clínica y disponibilidad de jugadores.')}
      icon={MdMedicalServices}
      actions={selectedTeam ? (
        <Button $variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('injuries:create'))}>
          <Row $gap={6}>
            <MdAdd size={18} />
            {t('injury.add', 'Registrar lesión')}
          </Row>
        </Button>
      ) : null}
    >
      {selectedTeam ? <InjuriesManagement /> : <TeamRequiredCard />}
    </RNWebPage>
  );
}

