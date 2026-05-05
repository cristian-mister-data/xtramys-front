import { useTranslation } from 'react-i18next';
import { MdFitnessCenter } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import ExerciseList from '@/vendor/exercise/exerciseList';

export default function Exercises() {
  const { t } = useTranslation();

  return (
    <RNWebPage
      title={t('menu.exercises', 'Ejercicios')}
      subtitle={t('sectionHeaders.exercises', 'Organiza ejercicios, carpetas y recursos para el trabajo diario.')}
      icon={MdFitnessCenter}
    >
      <ExerciseList />
    </RNWebPage>
  );
}
