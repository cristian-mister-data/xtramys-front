import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as authApi from '@/api/auth';
import {
  AuthFormShell,
  ErrorMessage,
  Field,
  Form,
  FormSubtitle,
  FormTitle,
  InfoMessage,
  InputLabel,
  PrimaryButton,
  SecondaryLink,
  TextInput,
  normalizeEmail,
} from './AuthFormLayout';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [correo, setCorreo] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!correo.trim()) {
      setError(t('forgot.enterEmail', 'Introduce tu correo electrónico'));
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(normalizeEmail(correo));
      setSent(true);
    } catch (err) {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormShell maxWidth="480px" showBrandName={false}>
      {!sent ? (
        <>
          <FormTitle>{t('forgot.title', 'Recuperar contraseña')}</FormTitle>
          <FormSubtitle>{t('forgot.subtitle', 'Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.')}</FormSubtitle>

          <Form onSubmit={onSubmit} noValidate>
            <Field>
              <InputLabel htmlFor="forgot-email">{t('login.email', 'Correo')}</InputLabel>
              <TextInput
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder={t('login.email', 'Correo')}
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
              />
            </Field>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <PrimaryButton type="submit" disabled={loading}>
              {loading ? '...' : t('forgot.send', 'Enviar enlace')}
            </PrimaryButton>
          </Form>
        </>
      ) : (
        <>
          <FormTitle $center>{t('forgot.sentTitle', 'Correo enviado')}</FormTitle>
          <FormSubtitle $center $tight>{t('forgot.sentMessage', 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.')}</FormSubtitle>
          <InfoMessage $center $success>{normalizeEmail(correo)}</InfoMessage>
        </>
      )}

      <SecondaryLink to="/auth/login">{t('forgot.backToLogin', 'Volver a iniciar sesión')}</SecondaryLink>
    </AuthFormShell>
  );
}
