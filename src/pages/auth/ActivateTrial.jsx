import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { activateTrialFromEmail } from '@/api/auth';
import { saveToken, saveUser, clearUser } from '@/auth/storage';
import { hasTrialAccess } from '@/utils/subscriptionAccess';

const Page = styled.main`
  min-height: 100dvh; display: grid; place-items: center; padding: 24px;
  background: ${({ theme }) => theme.colors.background}; color: ${({ theme }) => theme.colors.text};
  section { width: 100%; max-width: 560px; padding: 32px; border-radius: 20px;
    border: 1px solid ${({ theme }) => theme.colors.border}; background: ${({ theme }) => theme.colors.surface}; }
  h1 { font-size: 28px; line-height: 1.3; }
  p { line-height: 1.65; }
  a { color: ${({ theme }) => theme.colors.primary}; text-decoration: underline; }
`;

export default function ActivateTrial() {
  const started = useRef(false);
  const [error, setError] = useState('');
  const { i18n } = useTranslation();
  const es = !i18n.language?.startsWith('en');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const correo = fragment.get('correo') || '';
    const token = fragment.get('token') || '';
    if (!correo || !/^[a-f0-9]{64}$/.test(token)) {
      setError(es ? 'El enlace está incompleto. Solicita uno nuevo desde tu cuenta.' : 'This link is incomplete. Request a new one from your account.');
      return;
    }
    activateTrialFromEmail({ correo, token }).then(async (result) => {
      if (!result.token || !hasTrialAccess(result.usuario)) throw new Error(es ? 'No se ha confirmado la activación de la prueba.' : 'Trial activation was not confirmed.');
      clearUser();
      await saveToken(result.token);
      saveUser(result.usuario);
      // Reload after saving the session so startup cannot overwrite it with the previous account.
      window.location.replace('/app');
    }).catch((err) => setError(err.message || (es ? 'No se pudo activar la prueba.' : 'Could not activate your trial.')));
  }, [es]);
  return <Page><section>
    <strong>Xtramys · {es ? '7 días gratis' : '7 days free'}</strong>
    <h1>{error ? (es ? 'No se pudo activar la prueba' : 'Could not activate your trial') : (es ? 'Activando tus 7 días gratis…' : 'Activating your 7 free days…')}</h1>
    {error ? <><p role="alert">{error}</p><Link to="/trial">{es ? 'Volver a mi cuenta' : 'Back to my account'}</Link></> : <p role="status">{es ? 'En unos segundos entrarás en la aplicación.' : 'You will enter the app in a few seconds.'}</p>}
  </section></Page>;
}
