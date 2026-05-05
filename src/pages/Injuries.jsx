import { useTranslation } from 'react-i18next';
import { MdMedicalServices } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import InjuriesManagement from '@/vendor/injuries/injuries';

export default function Injuries() {
  const { t } = useTranslation();

  return (
    <RNWebPage
      themed
      title={t('menu.injuries', 'Lesiones')}
      subtitle={t('sectionHeaders.injuries', 'Registra lesiones, evolución clínica y disponibilidad de jugadores.')}
      icon={MdMedicalServices}
    >
      <InjuriesManagement />
    </RNWebPage>
  );
}
