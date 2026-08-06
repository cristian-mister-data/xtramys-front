import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as authApi from '@/api/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/slices/user/userSlice';
import { RESET_STORE } from '@/store/actionTypes';
import { saveUser, saveToken } from '@/auth/storage';
import api from '@/api/client';
import {
  AuthFormShell,
  ErrorMessage,
  Field,
  Form,
  FormSubtitle,
  FormTitle,
  InputLabel,
  PrimaryButton,
  SecondaryLink,
  TextInput,
  normalizeEmail,
} from './AuthFormLayout';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [token, setToken] = useState(params.get('token') || '');
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !token.trim() || !password || !confirm) {
      setError(t('reset.fillFields', 'Rellena todos los campos'));
      return;
    }
    if (password !== confirm) {
      setError(t('message.passwordMismatch', 'Las contraseñas no coinciden'));
      return;
    }
    if (password.length < 8) {
      setError(t('message.passwordTooShort', 'La contraseña debe tener al menos 8 caracteres'));
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        correo: normalizeEmail(email),
        token: token.trim(),
        nuevaContraseña: password,
      });
      setDone(true);
      const user = res?.data?.usuario;
      const jwtToken = res?.data?.token;
      if (jwtToken && user) {
        api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
        await saveToken(jwtToken);
        saveUser(user);
        dispatch({ type: RESET_STORE });
        dispatch(setUser(user));
        if (user.clubId && user.nombre === 'Entrenador' && !user.apellido) {
          navigate('/coach-setup', { replace: true });
        } else {
          navigate('/app', { replace: true });
        }
      }
    } catch (err) {
      const code = err?.code || err?.data?.code;
      setError(
        code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED'
          ? t('reset.linkExpired', 'El enlace ha expirado o no es válido. Solicita uno nuevo.')
          : err?.message || t('reset.errorGeneric', 'Error al restablecer la contraseña'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormShell maxWidth="480px" showBrandName={false}>
      {!done ? (
        <>
          <FormTitle>{t('reset.title', 'Nueva contraseña')}</FormTitle>
          <FormSubtitle>{t('reset.subtitle', 'Introduce tu nueva contraseña.')}</FormSubtitle>

          <Form onSubmit={onSubmit} noValidate>
            <Field>
              <InputLabel htmlFor="reset-email">{t('login.email', 'Correo')}</InputLabel>
              <TextInput
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                disabled={Boolean(params.get('email'))}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            {!params.get('token') && (
              <Field>
                <InputLabel htmlFor="reset-token">Token</InputLabel>
                <TextInput id="reset-token" value={token} onChange={(event) => setToken(event.target.value)} />
              </Field>
            )}

            <Field>
              <InputLabel htmlFor="reset-password">{t('reset.newPassword', 'Nueva contraseña')}</InputLabel>
              <TextInput
                id="reset-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            <Field>
              <InputLabel htmlFor="reset-confirm">{t('register.confirmPassword', 'Repetir contraseña')}</InputLabel>
              <TextInput
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </Field>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <PrimaryButton type="submit" disabled={loading}>
              {loading ? '...' : t('reset.resetButton', 'Restablecer contraseña')}
            </PrimaryButton>
          </Form>
        </>
      ) : (
        <>
          <FormTitle $center>{t('reset.doneTitle', 'Contraseña actualizada')}</FormTitle>
          <FormSubtitle $center>{t('reset.doneMessage', 'Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.')}</FormSubtitle>
          <Link to="/auth/login" style={{ textDecoration: 'none' }}>
            <PrimaryButton as="span" type="button">{t('login.buttonLogin', 'Iniciar sesión')}</PrimaryButton>
          </Link>
        </>
      )}

      {!done && <SecondaryLink to="/auth/login">{t('forgot.backToLogin', 'Volver a iniciar sesión')}</SecondaryLink>}
    </AuthFormShell>
  );
}
