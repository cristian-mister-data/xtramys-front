import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as authApi from '@/api/auth';
import {
  AuthFormShell,
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
} from './AuthFormLayout';

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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

  const validate = () => {
    const nextErrors = {};
    if (!form.nombre.trim()) nextErrors.nombre = true;
    if (!form.apellido.trim()) nextErrors.apellido = true;
    if (!form.correo.trim()) nextErrors.correo = true;
    else if (!isValidEmail(form.correo)) nextErrors.correo = 'invalid';
    if (!form.contraseña) nextErrors.contraseña = true;
    else if (form.contraseña.length < 8) nextErrors.contraseña = 'short';
    if (!form.confirmar) nextErrors.confirmar = true;
    setErrors(nextErrors);
    return nextErrors;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setShowErrors(true);
    setAlert(null);

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.contraseña === 'short') {
        setAlert(t('message.passwordTooShort', 'La contraseña debe tener al menos 8 caracteres'));
      }
      return;
    }

    if (form.contraseña !== form.confirmar) {
      setAlert(t('message.passwordMismatch', 'Las contraseñas no coinciden'));
      return;
    }

    const correoNorm = normalizeEmail(form.correo);
    setLoading(true);
    try {
      const data = await authApi.register({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: correoNorm,
        contraseña: form.contraseña,
        idioma: language === 'es' ? 'es' : 'en',
      });

      navigate('/auth/verify-email', { state: { correo: data?.correo || correoNorm } });
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
      <FormSubtitle>{t('register.subtitle', 'Únete a la comunidad de entrenadores profesionales')}</FormSubtitle>

      <Form onSubmit={onSubmit} noValidate>
        <RowFields>
          <Field>
            <InputLabel htmlFor="register-name">{t('register.firstName', 'Nombre')}</InputLabel>
            <TextInput
              id="register-name"
              value={form.nombre}
              onChange={update('nombre')}
              placeholder={t('register.firstName', 'Nombre')}
              aria-invalid={showErrors && errors.nombre ? 'true' : 'false'}
            />
          </Field>
          <Field>
            <InputLabel htmlFor="register-lastname">{t('register.lastName', 'Apellido')}</InputLabel>
            <TextInput
              id="register-lastname"
              value={form.apellido}
              onChange={update('apellido')}
              placeholder={t('register.lastName', 'Apellido')}
              aria-invalid={showErrors && errors.apellido ? 'true' : 'false'}
            />
          </Field>
        </RowFields>

        <Field>
          <InputLabel htmlFor="register-email">{t('register.email', 'Correo')}</InputLabel>
          <TextInput
            id="register-email"
            type="email"
            autoComplete="email"
            value={form.correo}
            onChange={update('correo')}
            placeholder={t('register.email', 'Correo')}
            aria-invalid={showErrors && errors.correo ? 'true' : 'false'}
          />
          {showErrors && errors.correo === 'invalid' && (
            <ErrorMessage>{t('register.invalidEmail', 'El correo no es válido')}</ErrorMessage>
          )}
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
