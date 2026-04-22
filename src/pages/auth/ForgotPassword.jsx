import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as authApi from '@/api/auth';
import { Card, Title, Subtitle, Field, Label, Input, Button, Stack, ErrorText, Muted } from '@/ui/primitives';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [correo, setCorreo] = useState('');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      await authApi.forgotPassword(correo.toLowerCase().trim());
      setInfo('Si el correo existe, recibirás un email con instrucciones.');
    } catch (err) {
      setError(err?.message || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <Title>{t('login.forgotPassword', 'Olvidé mi contraseña')}</Title>
      <Subtitle>Te enviaremos un email para restablecerla</Subtitle>
      <form onSubmit={onSubmit}>
        <Field>
          <Label>{t('login.email', 'Correo')}</Label>
          <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        {info && <Muted>{info}</Muted>}
        <Stack $gap={10} style={{ marginTop: 16 }}>
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? '...' : 'Enviar'}</Button>
          <Link to="/auth/login"><Muted>{t('navigation.goBack', 'Atrás')}</Muted></Link>
        </Stack>
      </form>
    </Card>
  );
}
