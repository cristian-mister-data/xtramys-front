import { useTranslation } from 'react-i18next';
import { MdFavorite } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import WellnessManagementView from '@/vendor/wellness/WellnessManagement';
import useSupervision from '@/hooks/useSupervision';

export default function WellnessManagement() {
  const { t } = useTranslation();
  const { canMutate } = useSupervision();

  return (
    <RNWebPage
      themed
      title={t('menu.wellness', 'Wellness')}
      subtitle={t('sectionHeaders.wellness', 'Consulta cuestionarios, sesiones y reportes de bienestar del equipo.')}
      icon={MdFavorite}
    >
      <WellnessManagementView canMutate={canMutate} />
    </RNWebPage>
  );
}
