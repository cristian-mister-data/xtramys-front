import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  AuthFormShell,
  BRAND_TEXT_LIGHT,
  FormSubtitle,
  FormTitle,
  PrimaryButton,
} from './AuthFormLayout';

const ButtonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;

  a {
    text-decoration: none;
  }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  width: 100%;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  padding: 16px 18px;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  color: ${BRAND_TEXT_LIGHT};
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
`;

export default function Welcome() {
  const { t } = useTranslation();
  const location = useLocation();
  const fromState = location.state?.from ? { from: location.state.from } : undefined;

  return (
    <AuthFormShell maxWidth="480px">
      <FormTitle $center>Xtramys</FormTitle>
      <FormSubtitle $center>{t('login.subtitle', 'Accede a tu cuenta para continuar')}</FormSubtitle>

      <ButtonStack>
        <Link to="/auth/login" state={fromState}>
          <PrimaryButton as="span" type="button" $spacious={false}>{t('login.buttonLogin', 'Iniciar sesión')}</PrimaryButton>
        </Link>
        <Link to="/auth/register" state={fromState}>
          <SecondaryButton type="button">{t('login.createAccount', 'Crear cuenta')}</SecondaryButton>
        </Link>
      </ButtonStack>
    </AuthFormShell>
  );
}
