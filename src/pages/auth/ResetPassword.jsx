import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as authApi from '@/api/auth';
import { Card, Title, Subtitle, Field, Label, Input, Button, Stack, ErrorText, Muted } from '@/ui/primitives';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError(t('message.passwordMismatch')); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/auth/login', { replace: true });
    } catch (err) { setError(err?.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <Card>
      <Title>Restablecer contraseña</Title>
      <Subtitle>Introduce tu nueva contraseña</Subtitle>
      <form onSubmit={onSubmit}>
        {!params.get('token') && (
          <Field>
            <Label>Token</Label>
            <Input value={token} onChange={(e) => setToken(e.target.value)} />
          </Field>
        )}
        <Field>
          <Label>{t('login.password', 'Contraseña')}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field>
          <Label>{t('register.confirmPassword', 'Repetir contraseña')}</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <Stack $gap={10} style={{ marginTop: 16 }}>
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? '...' : 'Restablecer'}</Button>
          <Link to="/auth/login"><Muted>{t('navigation.goBack', 'Atrás')}</Muted></Link>
        </Stack>
      </form>
    </Card>
  );
}
