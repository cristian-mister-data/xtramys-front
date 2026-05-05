import { useTranslation } from 'react-i18next';
import { MdDescription } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import MatchSheetList from '@/vendor/matchSheet/matchSheetList';

export default function MatchSheets() {
  const { t } = useTranslation();

  return (
    <RNWebPage
      themed
      title={t('menu.matchSheets', 'Fichas de Partido')}
      subtitle={t('sectionHeaders.matchSheets', 'Prepara convocatorias, alineaciones y registros de cada encuentro.')}
      icon={MdDescription}
    >
      <MatchSheetList />
    </RNWebPage>
  );
}
