import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginThunk } from '@/store/slices/user/userThunks';
import {
  AccentLink,
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

export default function Login() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((state) => state.usuario);

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

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
      const from = location.state?.from?.pathname || '/';
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

  const visibleError = localError || (typeof error === 'string' ? error : error?.message);

  return (
    <AuthFormShell maxWidth="480px">
      <FormTitle>{t('login.login', 'Login')}</FormTitle>
      <FormSubtitle>{t('login.subtitle', 'Accede a tu cuenta para continuar')}</FormSubtitle>

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
      <SecondaryLink to="/auth/welcome">{t('register.backToLogin', 'Atrás')}</SecondaryLink>
    </AuthFormShell>
  );
}
