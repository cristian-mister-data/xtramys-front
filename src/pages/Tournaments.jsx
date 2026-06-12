import { useTranslation } from 'react-i18next';
import { MdEmojiEvents } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import TournamentsView from '@/vendor/tournaments/tournaments';
import useSupervision from '@/hooks/useSupervision';

export default function Tournaments() {
  const { t } = useTranslation();
  const { canMutate } = useSupervision();

  return (
    <RNWebPage
      themed
      title={t('menu.tournaments', 'Torneos')}
      subtitle={t('sectionHeaders.tournaments', 'Gestiona competiciones, estados y seguimiento del calendario competitivo.')}
      icon={MdEmojiEvents}
    >
      <TournamentsView canMutate={canMutate} />
    </RNWebPage>
  );
}