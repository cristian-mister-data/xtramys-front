import { useTranslation } from 'react-i18next';
import { MdSportsSoccer } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import ExerciseList from '@/vendor/exercise/exerciseList';
import useSupervision from '@/hooks/useSupervision';

export default function Exercises() {
  const { t } = useTranslation();
  const { canMutate } = useSupervision();

  return (
    <RNWebPage themed
      title={t('menu.exercises', 'Ejercicios')}
      subtitle={t('sectionHeaders.exercises', 'Organiza ejercicios, carpetas y recursos para el trabajo diario.')}
      icon={MdSportsSoccer}
    >
      <ExerciseList canMutate={canMutate} />
    </RNWebPage>
  );
}