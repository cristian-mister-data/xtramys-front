import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import * as authApi from '@/api/auth';
import { setUser } from '@/store/slices/user/userSlice';
import { getGoogleOAuthURL } from '@/api/auth';
import {
  AuthFormShell,
  Divider,
  ErrorMessage,
  FLAGS,
  Field,
  FlagButton,
  FlagImage,
  Form,
  FormSubtitle,
  FormTitle,
  InputLabel,
  LanguageLabel,
  LanguageSection,
  LanguageSelector,
  PrimaryButton,
  RowFields,
  SecondaryLink,
  TextInput,
  isValidEmail,
  normalizeEmail,
  SocialButton,
} from './AuthFormLayout';

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    contraseña: '',
    confirmar: '',
  });
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLanguage(i18n.language || 'en');
  }, [i18n.language]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  const handleGoogleRegister = () => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    window.location.href = getGoogleOAuthURL(lang, '/');
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.nombre.trim()) nextErrors.nombre = true;
    if (!form.apellido.trim()) nextErrors.apellido = true;
    if (!form.correo.trim()) nextErrors.correo = true;
    if (!form.contraseña) nextErrors.contraseña = true;
    if (!form.confirmar) nextErrors.confirmar = true;
    if (form.correo && !isValidEmail(form.correo)) nextErrors.correo = true;
    if (form.contraseña && form.contraseña.length < 8) nextErrors.contraseña = true;
    if (form.contraseña && form.confirmar && form.contraseña !== form.confirmar) nextErrors.confirmar = true;
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setShowErrors(true);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const correoNorm = normalizeEmail(form.correo);
    setLoading(true);
    try {
      await authApi.register({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: correoNorm,
        contraseña: form.contraseña,
        idioma: language,
      });
      navigate('/auth/verify-email', { state: { correo: correoNorm } });
    } catch (err) {
      if (err?.code === 'EMAIL_IN_USE') {
        setAlert(t('message.emailAlreadyInUse', 'Este correo electrónico ya está en uso'));
      } else {
        setAlert(err?.message || t('register.registerError', 'Error al registrar el usuario'));
      }
    } finally {
      setLoading(false);
    }
  };

  const hasFieldErrors = showErrors && Object.keys(errors).length > 0;

  return (
    <AuthFormShell maxWidth="520px" compact>
      <FormTitle $compact>{t('register.register', 'Registrarse')}</FormTitle>

      <SocialButton type="button" onClick={handleGoogleRegister}>
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {t('register.signUpWithGoogle', 'Registrarse con Google')}
      </SocialButton>

      <Divider>{t('common.or', 'o')}</Divider>

      <Form onSubmit={handleSubmit} noValidate>
        <RowFields>
          <Field>
            <InputLabel htmlFor="register-name">{t('register.name', 'Nombre')}</InputLabel>
            <TextInput
              id="register-name"
              autoComplete="given-name"
              value={form.nombre}
              onChange={update('nombre')}
              placeholder={t('register.name', 'Nombre')}
              aria-invalid={showErrors && errors.nombre ? 'true' : 'false'}
            />
          </Field>
          <Field>
            <InputLabel htmlFor="register-lastname">{t('register.lastname', 'Apellido')}</InputLabel>
            <TextInput
              id="register-lastname"
              autoComplete="family-name"
              value={form.apellido}
              onChange={update('apellido')}
              placeholder={t('register.lastname', 'Apellido')}
              aria-invalid={showErrors && errors.apellido ? 'true' : 'false'}
            />
          </Field>
        </RowFields>

        <Field>
          <InputLabel htmlFor="register-email">{t('register.email', 'Correo electrónico')}</InputLabel>
          <TextInput
            id="register-email"
            type="email"
            autoComplete="email"
            value={form.correo}
            onChange={update('correo')}
            placeholder="tu@correo.com"
            aria-invalid={showErrors && errors.correo ? 'true' : 'false'}
          />
        </Field>

        <RowFields>
          <Field>
            <InputLabel htmlFor="register-password">{t('register.password', 'Contraseña')}</InputLabel>
            <TextInput
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={form.contraseña}
              onChange={update('contraseña')}
              placeholder="••••••••"
              aria-invalid={showErrors && errors.contraseña ? 'true' : 'false'}
            />
          </Field>
          <Field>
            <InputLabel htmlFor="register-confirm">{t('register.confirmPassword', 'Repetir contraseña')}</InputLabel>
            <TextInput
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirmar}
              onChange={update('confirmar')}
              placeholder="••••••••"
              aria-invalid={showErrors && errors.confirmar ? 'true' : 'false'}
            />
          </Field>
        </RowFields>

        {hasFieldErrors && <ErrorMessage $center>{t('register.requiredFields', 'Rellena los campos obligatorios')}</ErrorMessage>}
        {alert && <ErrorMessage $center>{alert}</ErrorMessage>}

        <LanguageSection>
          <LanguageLabel>{t('register.preferredLanguage', 'Idioma preferido')}</LanguageLabel>
          <LanguageSelector>
            {['es', 'en'].map((lang) => (
              <FlagButton
                key={lang}
                type="button"
                $selected={language === lang}
                onClick={() => changeLanguage(lang)}
                aria-label={lang === 'es' ? 'Español' : 'English'}
              >
                <FlagImage src={FLAGS[lang]} alt={lang === 'es' ? 'Español' : 'English'} />
              </FlagButton>
            ))}
          </LanguageSelector>
        </LanguageSection>

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? '...' : t('register.register', 'Registrarse')}
        </PrimaryButton>
      </Form>

      <SecondaryLink to="/auth/welcome">{t('register.backToLogin', 'Atrás')}</SecondaryLink>
    </AuthFormShell>
  );
}