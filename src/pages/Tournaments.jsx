import { useTranslation } from 'react-i18next';
import { MdEmojiEvents } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import TournamentsView from '@/vendor/tournaments/tournaments';

export default function Tournaments() {
  const { t } = useTranslation();

  return (
    <RNWebPage
      themed
      title={t('menu.tournaments', 'Torneos')}
      subtitle={t('sectionHeaders.tournaments', 'Gestiona competiciones, estados y seguimiento del calendario competitivo.')}
      icon={MdEmojiEvents}
    >
      <TournamentsView />
    </RNWebPage>
  );
}
