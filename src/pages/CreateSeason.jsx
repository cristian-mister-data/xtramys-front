import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import RNWebPage from './_RNWebPage';
import CreateSeasonAndTeam from '@/vendor/createSeason/createSeason';
import { fetchTemporadasUsuario } from '@/store/slices/season/seasonThunks';

export default function CreateSeason() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.usuario.user);
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;

    async function checkExistingSeasons() {
      if (!user?._id) {
        setStatus('hasSeason');
        return;
      }

      try {
        const seasons = await dispatch(fetchTemporadasUsuario({ usuario: user._id })).unwrap();
        if (active) setStatus(Array.isArray(seasons) && seasons.length > 0 ? 'hasSeason' : 'empty');
      } catch {
        if (active) setStatus('hasSeason');
      }
    }

    checkExistingSeasons();

    return () => {
      active = false;
    };
  }, [dispatch, user?._id]);

  if (status === 'checking') {
    return <RNWebPage themed fullscreen />;
  }

  if (status === 'hasSeason') {
    return <Navigate to={user?.role === 'club_admin' ? '/club/dashboard' : '/app'} replace />;
  }

  return (
    <RNWebPage themed fullscreen>
      <CreateSeasonAndTeam setToken={() => {}} />
    </RNWebPage>
  );
}
