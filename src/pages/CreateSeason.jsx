import RNWebPage from './_RNWebPage';
import CreateSeasonAndTeam from '@/vendor/createSeason/createSeason';

export default function CreateSeason() {
  return (
    <RNWebPage themed fullscreen>
      <CreateSeasonAndTeam setToken={() => {}} />
    </RNWebPage>
  );
}
