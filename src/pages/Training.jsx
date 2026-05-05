import { useTranslation } from 'react-i18next';
import { MdTimer } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import TrainingView from '@/vendor/training/training';

export default function Training() {
  const { t } = useTranslation();

  return (
    <RNWebPage
      title={t('menu.training', 'Entrenamientos')}
      subtitle={t('sectionHeaders.training', 'Planifica sesiones, controla el historial y prepara el trabajo semanal.')}
      icon={MdTimer}
    >
      <TrainingView />
    </RNWebPage>
  );
}
