import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import * as authApi from '@/api/auth';
import api from '@/api/client';
import { saveToken, saveUser } from '@/auth/storage';
import { setUser } from '@/store/slices/user/userSlice';
import {
  AuthFormShell,
  ErrorMessage,
  FormSubtitle,
  FormTitle,
  PrimaryButton,
  SecondaryLink,
  normalizeEmail,
} from './AuthFormLayout';

export default function AcceptClubInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const email = normalizeEmail(params.get('email'));
  const token = params.get('token') || '';
  const [error, setError] = useState(!email || !token ? 'El enlace de invitacion no es valido o esta incompleto.' : null);
  const [loading, setLoading] = useState(false);

  const acceptInvite = async () => {
    if (!email || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.acceptClubInvite({ correo: email, token });
      if (res.token && res.usuario) {
        api.defaults.headers.common.Authorization = `Bearer ${res.token}`;
        saveToken(res.token);
        saveUser(res.usuario);
        dispatch(setUser(res.usuario));
      }
      navigate(res.usuario?.coachSetupCompleted === false ? '/coach-setup' : '/app', { replace: true });
    } catch (err) {
      const expired = err?.code === 'INVALID_TOKEN' || err?.code === 'TOKEN_EXPIRED';
      setError(expired ? 'La invitacion ha expirado o ya no es valida.' : err.message || 'No se pudo aceptar la invitacion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormShell maxWidth="480px" showBrandName={false}>
      <FormTitle $center>Aceptar invitacion del club</FormTitle>
      <FormSubtitle $center>
        Al aceptar, tu cuenta pasara a estar asociada al club y se cancelara tu plan Pro individual si estaba activo.
      </FormSubtitle>

      {error && <ErrorMessage $center>{error}</ErrorMessage>}

      <PrimaryButton type="button" disabled={loading || !email || !token} onClick={acceptInvite}>
        {loading ? '...' : 'Aceptar invitacion'}
      </PrimaryButton>

      <SecondaryLink to="/auth/login">Volver a iniciar sesion</SecondaryLink>
    </AuthFormShell>
  );
}
