import { useTranslation } from 'react-i18next';
import { MdAccessibility } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import AnthropometryView from '@/vendor/anthropometry/anthropometry';

export default function Anthropometry() {
  const { t } = useTranslation();

  return (
    <RNWebPage
      themed
      title={t('sectionHeaders.anthropometryTitle', 'Pliegues y Pesos')}
      subtitle={t('sectionHeaders.anthropometry', 'Controla mediciones corporales, filtros por jugador y evolución física.')}
      icon={MdAccessibility}
    >
      <AnthropometryView />
    </RNWebPage>
  );
}
