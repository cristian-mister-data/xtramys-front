import RNWebPage from './_RNWebPage';
import SeasonView from '@/vendor/season/season';
import useSupervision from '@/hooks/useSupervision';

export default function Season() {
  const { canMutate } = useSupervision();
  return (
    <RNWebPage themed>
      <SeasonView canMutate={canMutate} />
    </RNWebPage>
  );
}
