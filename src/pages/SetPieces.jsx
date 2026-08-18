import { useTranslation } from 'react-i18next';
import { MdSportsSoccer } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import StrategyList from '@/vendor/strategy/strategyList';
import useSupervision from '@/hooks/useSupervision';
import DemoSubscriptionNotice from '@/components/shared/DemoSubscriptionNotice';

export default function SetPieces() {
  const { t } = useTranslation();
  const { canMutate } = useSupervision();

  return (
    <RNWebPage themed
      title={t('setPieces.title', 'ABP')}
      subtitle={t('setPieces.subtitle', 'Acciones a balón parado, recursos gráficos y vídeos asociados.')}
      icon={MdSportsSoccer}
    >
      <DemoSubscriptionNotice />
      <StrategyList canMutate={canMutate} kind="setPiece" />
    </RNWebPage>
  );
}
