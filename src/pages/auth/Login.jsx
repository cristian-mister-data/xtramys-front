import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginThunk } from '@/store/slices/user/userThunks';
import { getGoogleOAuthURL } from '@/api/auth';
import {
  AccentLink,
  AuthFormShell,
  Divider,
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
  SocialButton,
} from './AuthFormLayout';

export default function Login() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, isAuthenticated, authChecked } = useSelector((state) => state.usuario);

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (authChecked && isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [authChecked, isAuthenticated, navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLocalError(null);

    if (!correo || !password) {
      setLocalError(t('message.fieldRequired', 'Por favor completa este campo'));
      return;
    }

    const correoNorm = normalizeEmail(correo);
    try {
      await dispatch(loginThunk({ correo: correoNorm, contraseña: password })).unwrap();
      const from = location.state?.from?.pathname || '/app';
      navigate(from, { replace: true });
    } catch (err) {
      const code = err?.code || err?.data?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        navigate('/auth/verify-email', { state: { correo: err?.data?.correo || correoNorm } });
        return;
      }
      setLocalError(err?.message || t('login.loginError', 'Correo o contraseña incorrectos'));
    }
  };

  const handleGoogleLogin = () => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const from = location.state?.from?.pathname || '/app';
    window.location.href = getGoogleOAuthURL(lang, from);
  };

  const visibleError = localError || (typeof error === 'string' ? error : error?.message);

  if (authChecked && isAuthenticated) {
    return null;
  }

  return (
    <AuthFormShell maxWidth="480px">
      <FormTitle>{t('login.login', 'Login')}</FormTitle>
      <FormSubtitle>{t('login.subtitle', 'Accede a tu cuenta para continuar')}</FormSubtitle>

      <SocialButton type="button" onClick={handleGoogleLogin}>
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {t('login.continueWithGoogle', 'Continuar con Google')}
      </SocialButton>

      <Divider>{t('common.or', 'o')}</Divider>

      <Form onSubmit={onSubmit} noValidate>
        <Field>
          <InputLabel htmlFor="login-email">{t('login.email', 'Correo')}</InputLabel>
          <TextInput
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={t('login.email', 'Correo')}
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
          />
        </Field>

        <Field>
          <InputLabel htmlFor="login-password">{t('login.password', 'Contraseña')}</InputLabel>
          <TextInput
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder={t('login.password', 'Contraseña')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        {visibleError && <ErrorMessage>{visibleError}</ErrorMessage>}

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? '...' : t('login.buttonLogin', 'Iniciar sesión')}
        </PrimaryButton>
      </Form>

      <AccentLink to="/auth/forgot-password">{t('login.forgotPassword', 'Olvidé mi contraseña')}</AccentLink>
      <SecondaryLink to="/auth/register">{t('login.createAccount', 'Crear cuenta')}</SecondaryLink>
    </AuthFormShell>
  );
}
