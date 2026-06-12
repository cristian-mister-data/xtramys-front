import { useTranslation } from 'react-i18next';
import { MdTimer } from 'react-icons/md';
import { useSelector } from 'react-redux';
import RNWebPage from './_RNWebPage';
import TrainingView from '@/vendor/training/training';
import TeamRequiredCard from '@/components/shared/TeamRequiredCard';
import useSupervision from '@/hooks/useSupervision';

export default function Training() {
  const { t } = useTranslation();
  const teams = useSelector((s) => s.team?.teams ?? []);
  const selectedTeam = teams.find((e) => e.seleccionado) || null;
  const { canMutate } = useSupervision();

  return (
    <RNWebPage
      themed
      title={t('menu.training', 'Entrenamientos')}
      subtitle={t('sectionHeaders.training', 'Planifica sesiones, controla el historial y prepara el trabajo semanal.')}
      icon={MdTimer}
    >
      {selectedTeam ? <TrainingView canMutate={canMutate} /> : <TeamRequiredCard />}
    </RNWebPage>
  );
}
