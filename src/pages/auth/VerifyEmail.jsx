import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import * as authApi from '@/api/auth';
import { saveUser, saveToken } from '@/auth/storage';
import { USE_COOKIE_AUTH } from '@/config';
import { setUser } from '@/store/slices/user/userSlice';
import {
  AuthFormShell,
  CodeInput,
  CodeRow,
  ErrorMessage,
  Field,
  Form,
  FormSubtitle,
  FormTitle,
  InfoMessage,
  InputLabel,
  MutedAction,
  PrimaryButton,
  SecondaryLink,
  TextInput,
  normalizeEmail,
} from './AuthFormLayout';

const CODE_LENGTH = 6;

export default function VerifyEmail() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const [correo, setCorreo] = useState(location.state?.correo || params.get('email') || '');
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submitCode = async (fullCode) => {
    setError(null);
    setInfo(null);

    if (!correo.trim()) {
      setError(t('forgot.enterEmail', 'Introduce tu correo electrónico'));
      return;
    }
    if (fullCode.length !== CODE_LENGTH) {
      setError(t('verify.incompleteCode', 'Introduce el código completo'));
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.verifyEmail(normalizeEmail(correo), fullCode);
      const token = data?.token;
      const user = data?.usuario || data?.user;
      if (token && !USE_COOKIE_AUTH) saveToken(token);
      if (user) {
        saveUser(user);
        dispatch(setUser(user));
      }
      navigate('/', { replace: true });
    } catch (err) {
      const codeValue = err?.code || err?.data?.code;
      let message = err?.message || t('verify.errorGeneric', 'Error al verificar el correo');
      if (codeValue === 'INVALID_CODE') message = t('verify.invalidCode', 'El código es incorrecto');
      else if (codeValue === 'CODE_EXPIRED') message = t('verify.codeExpired', 'El código ha expirado. Solicita uno nuevo');
      else if (codeValue === 'ALREADY_VERIFIED') message = t('verify.alreadyVerified', 'Este correo ya está verificado');
      else if (codeValue === 'TOO_MANY_ATTEMPTS') message = t('verify.tooManyAttempts', 'Demasiados intentos fallidos. Solicita un nuevo código.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    submitCode(code.join(''));
  };

  const handleChange = (value, index) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);

    if (digit && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    const fullCode = nextCode.join('');
    if (digit && index === CODE_LENGTH - 1 && fullCode.length === CODE_LENGTH) {
      submitCode(fullCode);
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (pasted.length <= 1) return;
    event.preventDefault();
    const nextCode = Array(CODE_LENGTH).fill('');
    pasted.split('').forEach((digit, index) => {
      nextCode[index] = digit;
    });
    setCode(nextCode);
    inputs.current[Math.min(pasted.length, CODE_LENGTH) - 1]?.focus();
    if (pasted.length === CODE_LENGTH) submitCode(pasted);
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const nextCode = [...code];
      nextCode[index - 1] = '';
      setCode(nextCode);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setInfo(null);

    if (!correo.trim()) {
      setError(t('forgot.enterEmail', 'Introduce tu correo electrónico'));
      return;
    }

    setResending(true);
    try {
      await authApi.resendVerification(normalizeEmail(correo));
      setCode(Array(CODE_LENGTH).fill(''));
      setCooldown(60);
      setInfo(t('verify.codeSent', 'Se ha enviado un nuevo código a tu correo'));
    } catch (err) {
      setError(err?.message || t('verify.resendError', 'Error al reenviar el código'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthFormShell maxWidth="480px" showBrandName={false}>
      <FormTitle $center>{t('verify.title', 'Verificar correo')}</FormTitle>
      <FormSubtitle $center>{t('verify.subtitle', { email: correo || t('login.email', 'Correo') })}</FormSubtitle>

      <Form onSubmit={onSubmit} noValidate>
        {!location.state?.correo && !params.get('email') && (
          <Field>
            <InputLabel htmlFor="verify-email">{t('login.email', 'Correo')}</InputLabel>
            <TextInput
              id="verify-email"
              type="email"
              autoComplete="email"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
            />
          </Field>
        )}

        <CodeRow onPaste={handlePaste}>
          {code.map((digit, index) => (
            <CodeInput
              key={index}
              ref={(node) => { inputs.current[index] = node; }}
              value={digit}
              onChange={(event) => handleChange(event.target.value, index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              $filled={Boolean(digit)}
              aria-label={`Código ${index + 1}`}
            />
          ))}
        </CodeRow>

        {error && <ErrorMessage $center>{error}</ErrorMessage>}
        {info && <InfoMessage $center $success>{info}</InfoMessage>}

        <PrimaryButton type="submit" disabled={loading} $spacious={false}>
          {loading ? '...' : t('verify.verify', 'Verificar')}
        </PrimaryButton>
      </Form>

      <MutedAction type="button" onClick={resend} disabled={resending || cooldown > 0}>
        {cooldown > 0 ? `${t('verify.resend', 'Reenviar código')} (${cooldown}s)` : t('verify.resend', 'Reenviar código')}
      </MutedAction>
      <SecondaryLink to="/auth/welcome">{t('register.backToLogin', 'Atrás')}</SecondaryLink>
    </AuthFormShell>
  );
}
