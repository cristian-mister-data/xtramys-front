import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from '@/theme/ThemeContext';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}`;
const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}`;

const Page = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  position: relative;
  overflow: hidden;
  background: ${({ $dark }) =>
    $dark
      ? 'linear-gradient(135deg, #0B0F19 0%, #1a2744 50%, #0B0F19 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'};
`;

const Glow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  background: ${({ $dark }) =>
    $dark
      ? 'radial-gradient(circle, rgba(255,107,0,0.1) 0%, transparent 70%)'
      : 'radial-gradient(circle, rgba(26,35,126,0.06) 0%, transparent 70%)'};
`;

const LogoImg = styled.img`
  height: 36px;
  margin-bottom: 40px;
  animation: ${fadeIn} 0.5s ease-out;
`;

const BigNumber = styled.div`
  position: relative;
  font-size: clamp(120px, 20vw, 180px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -8px;
  margin-bottom: -16px;
  animation: ${fadeIn} 0.5s ease-out;
  color: ${({ $dark }) => ($dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)')};
  user-select: none;
`;

const NumberOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: clamp(60px, 10vw, 80px);
  font-weight: 800;
  letter-spacing: -2px;
  animation: ${float} 4s ease-in-out infinite;
  background: ${({ $dark }) =>
    $dark
      ? 'linear-gradient(135deg, #FF6B00, #E55A00)'
      : 'linear-gradient(135deg, #1a237e, #3949ab)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Content = styled.div`
  text-align: center;
  max-width: 420px;
  animation: ${fadeIn} 0.6s ease-out;
  animation-delay: 0.1s;
  animation-fill-mode: backwards;
`;

const Title = styled.h1`
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: ${({ $dark }) => ($dark ? '#fff' : '#0f172a')};
`;

const Description = styled.p`
  margin: 0 0 32px;
  font-size: 16px;
  line-height: 1.6;
  color: ${({ $dark }) => ($dark ? 'rgba(255,255,255,0.5)' : '#64748b')};
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  @media (min-width: 480px) {
    flex-direction: row;
    justify-content: center;
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border: 0;
  border-radius: 14px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
  background: linear-gradient(135deg, #FF6B00, #E55A00);
  box-shadow: 0 8px 24px rgba(255,107,0,0.3);

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 12px 32px rgba(255,107,0,0.4);
  }
`;

const SecondaryButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 14px;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  border: 1px solid ${({ $dark }) => ($dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')};
  background: ${({ $dark }) => ($dark ? 'rgba(255,255,255,0.05)' : '#fff')};
  color: ${({ $dark }) => ($dark ? '#e2e8f0' : '#334155')};

  &:hover {
    background: ${({ $dark }) => ($dark ? 'rgba(255,255,255,0.1)' : '#f1f5f9')};
  }
`;

const Footer = styled.p`
  position: absolute;
  bottom: 24px;
  font-size: 12px;
  color: ${({ $dark }) => ($dark ? 'rgba(255,255,255,0.2)' : '#94a3b8')};
`;

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const goHome = () => navigate('/');

  return (
    <Page $dark={isDark}>
      <Glow $dark={isDark} />
      <LogoImg
        src={isDark ? 'https://xtramys.com/images/logos/xtramys_blanco.png' : 'https://xtramys.com/images/logos/xtramys.png'}
        alt="Xtramys"
      />
      <BigNumber $dark={isDark}>
        404
        <NumberOverlay $dark={isDark}>404</NumberOverlay>
      </BigNumber>
      <Content>
        <Title $dark={isDark}>{t('notFound.title', 'Página no encontrada')}</Title>
        <Description $dark={isDark}>{t('notFound.description', 'Lo sentimos, la página que buscas no existe o ha sido movida.')}</Description>
        <Actions>
          <PrimaryButton onClick={goHome}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {t('notFound.backHome', 'Volver al inicio')}
          </PrimaryButton>
          <SecondaryButton
            href="https://xtramys.com/es/precios"
            $dark={isDark}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('notFound.goPricing', 'Ver precios')}
          </SecondaryButton>
        </Actions>
      </Content>
      <Footer $dark={isDark}>&copy; {new Date().getFullYear()} Xtramys. All rights reserved.</Footer>
    </Page>
  );
}