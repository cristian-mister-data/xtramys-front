import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as authApi from '@/api/auth';
import { saveUser, saveToken } from '@/auth/storage';
import { USE_COOKIE_AUTH } from '@/config';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/slices/user/userSlice';
import { Card, Title, Subtitle, Field, Label, Input, Button, Stack, ErrorText, Muted } from '@/ui/primitives';

export default function VerifyEmail() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [correo, setCorreo] = useState(location.state?.correo || '');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      const res = await authApi.verifyEmail(correo.toLowerCase().trim(), codigo);
      const data = res.data || res;
      const token = data?.token;
      const user = data?.usuario || data?.user;
      if (token && !USE_COOKIE_AUTH) saveToken(token);
      if (user) {
        saveUser(user);
        dispatch(setUser(user));
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Código inválido');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    setError(null); setInfo(null);
    try {
      await authApi.resendVerification(correo.toLowerCase().trim());
      setInfo('Código reenviado');
    } catch (err) { setError(err?.message || 'Error reenviando'); }
  };

  return (
    <Card>
      <Title>Verifica tu email</Title>
      <Subtitle>Introduce el código que te hemos enviado</Subtitle>
      <form onSubmit={verify}>
        <Field>
          <Label>{t('login.email', 'Correo')}</Label>
          <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </Field>
        <Field>
          <Label>Código</Label>
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        {info && <Muted>{info}</Muted>}
        <Stack $gap={10} style={{ marginTop: 16 }}>
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? '...' : 'Verificar'}</Button>
          <Button type="button" $variant="secondary" onClick={resend}>Reenviar código</Button>
          <Link to="/auth/login"><Muted>{t('navigation.goBack', 'Atrás')}</Muted></Link>
        </Stack>
      </form>
    </Card>
  );
}
