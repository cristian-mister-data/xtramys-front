import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Card, Title, Subtitle, Stack, Button } from '@/ui/primitives';

const Logo = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
  margin-bottom: 24px;
`;

export default function Welcome() {
  const { t } = useTranslation();
  return (
    <Card>
      <Logo>Xtramys</Logo>
      <Title style={{ textAlign: 'center' }}>Mister Data</Title>
      <Subtitle style={{ textAlign: 'center' }}>
        {t('login.subtitle', 'Accede a tu cuenta para continuar')}
      </Subtitle>
      <Stack $gap={12}>
        <Link to="/auth/login"><Button style={{ width: '100%' }}>{t('login.buttonLogin', 'Iniciar sesión')}</Button></Link>
        <Link to="/auth/register"><Button $variant="secondary" style={{ width: '100%' }}>{t('login.createAccount', 'Crear cuenta')}</Button></Link>
      </Stack>
    </Card>
  );
}
