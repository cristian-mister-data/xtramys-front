import RNWebPage from './_RNWebPage';
import HomeView from '@/vendor/home/home';
import useSupervision from '@/hooks/useSupervision';

export default function Home() {
  const { canMutate } = useSupervision();
  return (
    <RNWebPage themed>
      <HomeView canMutate={canMutate} />
    </RNWebPage>
  );
}
