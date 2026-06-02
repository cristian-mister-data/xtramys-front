import { useTranslation } from 'react-i18next';
import { MdSportsSoccer } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import ExerciseList from '@/vendor/exercise/exerciseList';

export default function Exercises() {
  const { t } = useTranslation();

  return (
    <RNWebPage themed
      title={t('menu.exercises', 'Ejercicios')}
      subtitle={t('sectionHeaders.exercises', 'Organiza ejercicios, carpetas y recursos para el trabajo diario.')}
      icon={MdSportsSoccer}
    >
      <ExerciseList />
    </RNWebPage>
  );
}
