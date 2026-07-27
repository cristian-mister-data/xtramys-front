import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaApple } from 'react-icons/fa';
import styled from 'styled-components';
import * as authApi from '@/api/auth';
import { getGoogleOAuthURL } from '@/api/auth';
import { saveToken, saveUser } from '@/auth/storage';
import { signInWithAppleWeb } from '@/platform/appleSignIn';
import { RESET_STORE } from '@/store/actionTypes';
import { setUser } from '@/store/slices/user/userSlice';
import { loginThunk } from '@/store/slices/user/userThunks';
import {
  Divider as AuthDivider,
  ErrorMessage,
  Field,
  Form,
  InputLabel,
  PrimaryButton,
  RowFields,
  SocialButton,
  TextInput,
  isValidEmail,
  normalizeEmail,
} from '@/pages/auth/AuthFormLayout';

const Tabs = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
`;

const Tab = styled.button`
  min-height: 40px;
  padding: 9px 12px;
  border: 0;
  border-radius: 6px;
  background: ${({ $active, theme }) => ($active ? theme.colors.surface : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textSecondary)};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadows.sm : 'none')};
`;

const Intro = styled.p`
  margin: 20px 0 4px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  line-height: 1.5;
`;

const TextAction = styled.button`
  display: block;
  margin: 14px auto 0;
  padding: 6px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const LegalNote = styled.p`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 11px;
  line-height: 1.45;
  text-align: center;
`;

const Divider = styled(AuthDivider)`
  margin-top: 14px;
  margin-bottom: 14px;
`;

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function paymentReturnPath(path) {
  const url = new URL(path, window.location.origin);
  url.searchParams.delete('checkout');
  url.searchParams.set('step', 'payment');
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function SubscribeAccountStep({ returnPath, intent = 'payment', onAuthenticated }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    password: '',
    confirm: '',
  });
  const [pendingEmail, setPendingEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError(null);
  };

  const chooseMode = (nextMode) => {
    setMode(nextMode);
    setPendingEmail('');
    setVerificationCode('');
    setError(null);
  };

  const handleGoogle = () => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const nextPath = intent === 'demo' ? '/app' : paymentReturnPath(returnPath);
    window.location.href = getGoogleOAuthURL(lang, nextPath);
  };

  const handleApple = async () => {
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithAppleWeb();
      const authenticatedUser = await dispatch(loginThunk({
        provider: 'apple',
        credential: {
          identityToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          nonce: credential.nonce,
          nombre: credential.givenName?.trim().slice(0, 100),
          apellido: credential.familyName?.trim().slice(0, 100),
          idioma: i18n.language?.startsWith('en') ? 'en' : 'es',
        },
      })).unwrap();
      onAuthenticated(authenticatedUser);
    } catch (err) {
      if (err?.code !== 'APPLE_SIGN_IN_CANCELLED') {
        setError(err?.message || t('social.appleError', 'No se pudo iniciar sesión con Apple'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const correo = normalizeEmail(form.correo);
    if (!isValidEmail(correo) || !form.password) {
      setError(t('register.requiredFields', 'Rellena los campos obligatorios'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const authenticatedUser = await dispatch(loginThunk({
          correo,
          ['contrase\u00f1a']: form.password,
        })).unwrap();
        onAuthenticated(authenticatedUser);
        return;
      }

      if (!form.nombre.trim() || !form.apellido.trim() || form.password.length < 8 || form.password !== form.confirm) {
        setError(
          form.password !== form.confirm
            ? t('register.passwordMismatch', 'Las contraseñas no coinciden')
            : t('register.requiredFields', 'Rellena los campos obligatorios. La contraseña debe tener al menos 8 caracteres.'),
        );
        return;
      }

      await authApi.register({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo,
        ['contrase\u00f1a']: form.password,
        idioma: i18n.language?.startsWith('en') ? 'en' : 'es',
      });
      setPendingEmail(correo);
    } catch (err) {
      const code = err?.code || err?.data?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(err?.data?.correo || correo);
      } else if (code === 'EMAIL_IN_USE') {
        setError(t('message.emailAlreadyInUse', 'Este correo electrónico ya está en uso'));
      } else {
        setError(err?.message || t('login.loginError', 'No se ha podido continuar'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(verificationCode)) {
      setError(t('verify.incompleteCode', 'Introduce el código completo de 6 dígitos'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await authApi.verifyEmail(pendingEmail, verificationCode);
      const token = data?.token;
      const authenticatedUser = data?.usuario || data?.user;
      if (token) saveToken(token);
      if (authenticatedUser) {
        saveUser(authenticatedUser);
        dispatch({ type: RESET_STORE });
        dispatch(setUser(authenticatedUser));
        onAuthenticated(authenticatedUser);
      }
    } catch (err) {
      setError(err?.message || t('verify.errorGeneric', 'Error al verificar el correo'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await authApi.resendVerification(pendingEmail);
    } catch (err) {
      setError(err?.message || t('verify.resendError', 'Error al reenviar el código'));
    } finally {
      setResending(false);
    }
  };

  if (pendingEmail) {
    return (
      <>
        <Intro>
          {t('verify.subtitle', { email: pendingEmail, defaultValue: 'Introduce el código de 6 dígitos enviado a {{email}}' })}
        </Intro>
        <Form onSubmit={handleVerify} noValidate>
          <Field>
            <InputLabel htmlFor="subscribe-verification-code">
              {t('verify.title', 'Verificar correo')}
            </InputLabel>
            <TextInput
              id="subscribe-verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
            />
          </Field>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <PrimaryButton type="submit" disabled={loading} $spacious={false}>
            {loading ? '...' : t('verify.verify', 'Verificar y continuar')}
          </PrimaryButton>
        </Form>
        <TextAction type="button" onClick={handleResend} disabled={resending}>
          {resending ? '...' : t('verify.resend', 'Reenviar código')}
        </TextAction>
        <TextAction type="button" onClick={() => setPendingEmail('')}>
          {t('register.backToLogin', 'Atrás')}
        </TextAction>
      </>
    );
  }

  return (
    <>
      <Tabs role="tablist" aria-label={t('subscription.account', 'Cuenta')}>
        <Tab type="button" role="tab" $active={mode === 'register'} onClick={() => chooseMode('register')}>
          {t('login.createAccount', 'Crear cuenta')}
        </Tab>
        <Tab type="button" role="tab" $active={mode === 'login'} onClick={() => chooseMode('login')}>
          {t('subscription.haveAccount', 'Ya tengo cuenta')}
        </Tab>
      </Tabs>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
        <SocialButton
          type="button"
          onClick={handleApple}
          disabled={loading}
          style={{ background: '#000', borderColor: '#000', color: '#fff' }}
        >
          <FaApple aria-hidden="true" />
          {loading ? '...' : t('social.apple', 'Continuar con Apple')}
        </SocialButton>

        <SocialButton type="button" onClick={handleGoogle} disabled={loading}>
          <GoogleIcon />
          {t('login.continueWithGoogle', 'Continuar con Google')}
        </SocialButton>
      </div>

      <Divider>{t('common.or', 'o')}</Divider>

      <Form onSubmit={handleSubmit} noValidate>
        {mode === 'register' && (
          <RowFields>
            <Field>
              <InputLabel htmlFor="subscribe-name">{t('register.name', 'Nombre')}</InputLabel>
              <TextInput id="subscribe-name" autoComplete="given-name" value={form.nombre} onChange={update('nombre')} />
            </Field>
            <Field>
              <InputLabel htmlFor="subscribe-lastname">{t('register.lastname', 'Apellido')}</InputLabel>
              <TextInput id="subscribe-lastname" autoComplete="family-name" value={form.apellido} onChange={update('apellido')} />
            </Field>
          </RowFields>
        )}

        <Field>
          <InputLabel htmlFor="subscribe-email">{t('login.email', 'Correo')}</InputLabel>
          <TextInput
            id="subscribe-email"
            type="email"
            autoComplete="email"
            value={form.correo}
            onChange={update('correo')}
            placeholder="tu@correo.com"
          />
        </Field>

        <Field>
          <InputLabel htmlFor="subscribe-password">{t('login.password', 'Contraseña')}</InputLabel>
          <TextInput
            id="subscribe-password"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={update('password')}
            placeholder={mode === 'register' ? t('register.passwordHint', 'Mínimo 8 caracteres') : ''}
          />
        </Field>

        {mode === 'register' && (
          <Field>
            <InputLabel htmlFor="subscribe-confirm">{t('register.confirmPassword', 'Confirmar contraseña')}</InputLabel>
            <TextInput
              id="subscribe-confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={update('confirm')}
            />
          </Field>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? '...' : intent === 'demo'
            ? mode === 'login'
              ? t('subscription.enterDemo', 'Entrar en la demo')
              : t('subscription.createDemoAccount', 'Crear cuenta y entrar en la demo')
            : t('subscription.continueToPayment', 'Continuar al pago')}
        </PrimaryButton>
      </Form>

      {mode === 'login' && (
        <TextAction type="button" onClick={() => navigate('/auth/forgot-password')}>
          {t('login.forgotPassword', 'Olvidé mi contraseña')}
        </TextAction>
      )}

      <LegalNote>
        {t('subscription.legalAccountNote', 'Al continuar aceptas los términos de uso y la política de privacidad.')}
      </LegalNote>
    </>
  );
}
