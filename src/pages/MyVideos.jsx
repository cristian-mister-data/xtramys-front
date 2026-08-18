import { useTranslation } from 'react-i18next';
import { MdVideoLibrary } from 'react-icons/md';
import RNWebPage from './_RNWebPage';
import MyVideosView from '@/vendor/myVideos/myVideos';
import useSupervision from '@/hooks/useSupervision';
import DemoSubscriptionNotice from '@/components/shared/DemoSubscriptionNotice';

export default function MyVideos() {
  const { t } = useTranslation();
  const { canMutate } = useSupervision();

  return (
    <RNWebPage themed
      title={t('menu.myVideos', 'Mis Videos')}
      subtitle={t('sectionHeaders.myVideos', 'Clasifica clips, carpetas y material audiovisual del cuerpo técnico.')}
      icon={MdVideoLibrary}
    >
      <DemoSubscriptionNotice />
      <MyVideosView canMutate={canMutate} />
    </RNWebPage>
  );
}
