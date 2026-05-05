import { useTranslation } from 'react-i18next';
import { MdOutlineAssignment } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import StrategyList from '@/vendor/strategy/strategyList';

export default function Strategies() {
  const { t } = useTranslation();

  return (
    <RNWebPage
      title={t('sectionHeaders.strategiesTitle', 'Estrategia / Táctica')}
      subtitle={t('sectionHeaders.strategies', 'Centraliza jugadas, carpetas tácticas y materiales del modelo de juego.')}
      icon={MdOutlineAssignment}
    >
      <StrategyList />
    </RNWebPage>
  );
}
