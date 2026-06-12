import { useTranslation } from 'react-i18next';
import { MdOutlineAssignment } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import StrategyList from '@/vendor/strategy/strategyList';
import useSupervision from '@/hooks/useSupervision';

export default function Strategies() {
  const { t } = useTranslation();
  const { canMutate } = useSupervision();

  return (
    <RNWebPage themed
      title={t('sectionHeaders.strategiesTitle', 'Estrategia / Táctica')}
      subtitle={t('sectionHeaders.strategies', 'Centraliza jugadas, carpetas tácticas y materiales del modelo de juego.')}
      icon={MdOutlineAssignment}
    >
      <StrategyList canMutate={canMutate} />
    </RNWebPage>
  );
}