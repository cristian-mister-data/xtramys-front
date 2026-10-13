import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/primitives';
import RNWebPage from './_RNWebPage';
import CreateSeasonAndTeam from '@/vendor/createSeason/createSeason';
import { fetchTemporadasUsuario } from '@/store/slices/season/seasonThunks';

export default function CreateSeason() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const user = useSelector((state) => state.usuario.user);
  const [status, setStatus] = useState('checking');
  const [existingSeasons, setExistingSeasons] = useState([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function checkExistingSeasons() {
      if (!user?._id) {
        setStatus('hasSeason');
        return;
      }

      try {
        setStatus('checking');
        const seasons = await dispatch(fetchTemporadasUsuario({ usuario: user._id })).unwrap();
        if (active) {
          setExistingSeasons(Array.isArray(seasons) ? seasons : []);
          setStatus(!user.trialSetupRequired && Array.isArray(seasons) && seasons.length > 0 ? 'hasSeason' : 'empty');
        }
      } catch {
        if (active) setStatus('error');
      }
    }

    checkExistingSeasons();

    return () => {
      active = false;
    };
  }, [dispatch, user?._id, user?.trialSetupRequired, user?.clubId, attempt]);

  if (status === 'checking') {
    return <RNWebPage themed fullscreen />;
  }

  if (status === 'hasSeason') {
    return <Navigate to={user?.role === 'club_admin' ? '/club/dashboard' : '/app'} replace />;
  }
  if (status === 'error') return <RNWebPage themed fullscreen>
    <p role="alert">{t('connection.apiUnavailableTitle', 'No se pudo cargar la configuración de tu cuenta.')}</p>
    <Button onClick={() => setAttempt(value => value + 1)}>{t('connection.retry', 'Reintentar')}</Button>
  </RNWebPage>;

  return (
    <RNWebPage themed fullscreen>
      <CreateSeasonAndTeam setToken={() => {}} existingSeasons={existingSeasons} />
    </RNWebPage>
  );
}
