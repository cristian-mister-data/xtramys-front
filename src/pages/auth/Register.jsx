import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as authApi from '@/api/auth';
import {
  Card, Title, Subtitle, Field, Label, Input, Button, Stack, ErrorText, Muted,
} from '@/ui/primitives';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
    contraseña: '',
    confirm: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.nombre || !form.apellidos || !form.correo || !form.contraseña) {
      setError(t('register.requiredFields', 'Rellena los campos obligatorios'));
      return;
    }
    if (form.contraseña !== form.confirm) {
      setError(t('message.passwordMismatch', 'Las contraseñas no coinciden'));
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        nombre: form.nombre,
        apellidos: form.apellidos,
        correo: form.correo.toLowerCase().trim(),
        contraseña: form.contraseña,
      });
      navigate('/auth/verify-email', { state: { correo: form.correo } });
    } catch (err) {
      setError(err?.message || t('register.registerError', 'Error al registrar el usuario'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Title>{t('register.register', 'Registrarse')}</Title>
      <Subtitle>{t('register.subtitle', 'Únete a la comunidad de entrenadores profesionales')}</Subtitle>
      <form onSubmit={onSubmit}>
        <Field>
          <Label>{t('register.firstName', 'Nombre')}</Label>
          <Input value={form.nombre} onChange={update('nombre')} />
        </Field>
        <Field>
          <Label>{t('register.lastName', 'Apellido')}</Label>
          <Input value={form.apellidos} onChange={update('apellidos')} />
        </Field>
        <Field>
          <Label>{t('register.email', 'Correo')}</Label>
          <Input type="email" value={form.correo} onChange={update('correo')} />
        </Field>
        <Field>
          <Label>{t('register.password', 'Contraseña')}</Label>
          <Input type="password" value={form.contraseña} onChange={update('contraseña')} />
        </Field>
        <Field>
          <Label>{t('register.confirmPassword', 'Repetir contraseña')}</Label>
          <Input type="password" value={form.confirm} onChange={update('confirm')} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <Stack $gap={10} style={{ marginTop: 16 }}>
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? '...' : t('register.register', 'Registrarse')}
          </Button>
          <Link to="/auth/login"><Muted>{t('register.backToLogin', 'Atrás')}</Muted></Link>
        </Stack>
      </form>
    </Card>
  );
}
