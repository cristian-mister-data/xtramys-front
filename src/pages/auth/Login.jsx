import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginThunk } from '@/store/slices/user/userThunks';
import {
  Card, Title, Subtitle, Field, Label, Input, Button, Stack, ErrorText, Muted, Row,
} from '@/ui/primitives';

export default function Login() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((s) => s.usuario);

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!correo || !password) {
      setLocalError(t('message.fieldRequired', 'Por favor completa este campo'));
      return;
    }
    try {
      const res = await dispatch(loginThunk({ correo, contraseña: password })).unwrap();
      if (res) {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (err) {
      const code = err?.code || err?.data?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        navigate('/auth/verify-email', { state: { correo } });
        return;
      }
      setLocalError(err?.message || t('login.loginError', 'Correo o contraseña incorrectos'));
    }
  };

  return (
    <Card>
      <Title>{t('login.buttonLogin', 'Iniciar sesión')}</Title>
      <Subtitle>{t('login.subtitle', 'Accede a tu cuenta para continuar')}</Subtitle>
      <form onSubmit={onSubmit}>
        <Field>
          <Label>{t('login.email', 'Correo')}</Label>
          <Input type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </Field>
        <Field>
          <Label>{t('login.password', 'Contraseña')}</Label>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {(localError || error) && <ErrorText>{localError || error}</ErrorText>}
        <Stack $gap={10} style={{ marginTop: 16 }}>
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? '...' : t('login.buttonLogin', 'Iniciar sesión')}
          </Button>
          <Row $gap={8} style={{ justifyContent: 'space-between' }}>
            <Link to="/auth/forgot-password"><Muted>{t('login.forgotPassword', 'Olvidé mi contraseña')}</Muted></Link>
            <Link to="/auth/register"><Muted>{t('login.createAccount', 'Crear cuenta')}</Muted></Link>
          </Row>
          <Link to="/auth/welcome"><Muted>{t('navigation.goBack', 'Atrás')}</Muted></Link>
        </Stack>
      </form>
    </Card>
  );
}
