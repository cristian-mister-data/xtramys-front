import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { useThemeMode } from '@/theme/ThemeContext';
import xtramysLogo from '@/images/xtramys.webp';
import xtramysWhiteLogo from '@/images/xtramys_white.webp';
import flagEs from '@/images/spain.png';
import flagEn from '@/images/united-kingdom.png';
import { FiSun, FiMoon } from 'react-icons/fi';

export const BRAND_PRIMARY = '#1a2a3a';
export const BRAND_ACCENT = '#00b4d8';
export const BRAND_BG = '#f0f4f8';
export const BRAND_CARD_BG = '#ffffff';
export const BRAND_TEXT = '#1a2a3a';
export const BRAND_TEXT_LIGHT = '#5a6a7a';
export const BRAND_BORDER = '#e2e8f0';
export const BRAND_INPUT_BG = '#f8fafc';
export const BRAND_ERROR = '#ef4444';
export const BRAND_SUCCESS = '#10b981';

export const normalizeEmail = (value) => String(value || '').toLowerCase().replace(/\s+/g, '');
export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const Shell = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ $compact }) => ($compact ? '24px 16px' : '40px 20px')};
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.background};
  transition: background-color 200ms ease, color 200ms ease;

  @media (max-width: 767px) {
    min-height: 100svh;
    justify-content: flex-start;
    padding: ${({ $compact }) => ($compact ? '18px 16px' : '28px 16px')};
  }

  @media (max-width: 767px) and (orientation: landscape) {
    padding-block: 16px;
  }
`;

const LogoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: ${({ $compact }) => ($compact ? '16px' : '28px')};
`;

const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ $compact }) => ($compact ? '8px' : '14px')};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ $compact }) => ($compact ? '18px' : '20px')};
  box-shadow: ${({ theme }) => theme.shadows.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const LogoImage = styled.img`
  width: ${({ $compact }) => ($compact ? '72px' : '96px')};
  height: ${({ $compact }) => ($compact ? '72px' : '96px')};
  object-fit: contain;

  @media (max-width: 767px) {
    width: ${({ $compact }) => ($compact ? '58px' : '76px')};
    height: ${({ $compact }) => ($compact ? '58px' : '76px')};
  }

  @media (max-width: 767px) and (orientation: landscape) {
    width: 54px;
    height: 54px;
  }
`;

const BrandName = styled.div`
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ $compact }) => ($compact ? '24px' : '28px')};
  font-weight: 800;
  letter-spacing: 1.5px;

  @media (max-width: 767px) {
    font-size: ${({ $compact }) => ($compact ? '20px' : '22px')};
    margin-top: 10px;
  }
`;

export const AuthCard = styled.section`
  width: 100%;
  max-width: ${({ $maxWidth = '480px' }) => $maxWidth};
  padding: ${({ $compact }) => ($compact ? '28px' : '36px')};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 24px;
  box-shadow: ${({ theme }) => theme.shadows.lg};

  @media (max-width: 767px) {
    padding: ${({ $compact }) => ($compact ? '20px' : '24px')};
  }
`;

const ThemeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundAlt || theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.surfaceAlt || theme.colors.surface}; }
  &:focus-visible { box-shadow: ${({ theme }) => theme.shadows.focus}; outline: none; }
`;

export function AuthFormShell({ children, maxWidth = '480px', compact = false, showBrandName = true }) {
  const { mode, toggleTheme } = useThemeMode();
  const logoImage = mode === 'dark' ? xtramysWhiteLogo : xtramysLogo;

  return (
    <Shell $compact={compact}>
      <LogoHeader $compact={compact}>
        <LogoWrapper $compact={compact}>
          <LogoImage src={logoImage} alt="Xtramys" $compact={compact} />
        </LogoWrapper>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {showBrandName && <BrandName $compact={compact}>Xtramys</BrandName>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <ThemeToggle
              type="button"
              onClick={toggleTheme}
              aria-label={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              title={`${mode === 'dark' ? 'Modo claro' : 'Modo oscuro'} (Ctrl+Shift+L)`}
            >
              {mode === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
            </ThemeToggle>
          </div>
        </div>
      </LogoHeader>
      <AuthCard $maxWidth={maxWidth} $compact={compact}>{children}</AuthCard>
    </Shell>
  );
}

export const FormTitle = styled.h1`
  margin: 0 0 6px;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ $compact }) => ($compact ? '24px' : '26px')};
  font-weight: 700;
  line-height: 1.15;
  ${({ $center }) => $center && 'text-align: center;'}

  @media (max-width: 767px) {
    font-size: ${({ $compact }) => ($compact ? '20px' : '22px')};
  }
`;

export const FormSubtitle = styled.p`
  margin: 0 0 ${({ $tight }) => ($tight ? '8px' : '24px')};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 15px;
  line-height: 1.55;
  ${({ $center }) => $center && 'text-align: center;'}

  @media (max-width: 767px) {
    font-size: 14px;
    margin-bottom: ${({ $tight }) => ($tight ? '8px' : '22px')};
  }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

export const RowFields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
`;

export const InputLabel = styled.label`
  margin: 12px 0 8px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;

  @media (max-width: 767px) {
    font-size: 13px;
  }
`;

const inputStyles = css`
  width: 100%;
  min-height: 50px;
  padding: 14px 16px;
  border: 1.5px solid ${({ theme }) => theme.colors.inputBorder};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 16px;
  outline: none;
  transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.inputPlaceholder};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.borderFocus || theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) => theme.colors.errorSoft || '#fff2f2'};
  }

  @media (max-width: 767px) {
    min-height: 48px;
    padding: 12px 14px;
    font-size: 15px;
  }
`;

export const TextInput = styled.input`${inputStyles}`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  width: 100%;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: ${({ $spacious = true }) => ($spacious ? '28px' : '18px')};
  padding: 16px 18px;
  border: 0;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary || theme.colors.textOnPrimary || '#ffffff'};
  font: inherit;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.md};
  transition: background-color 140ms ease, transform 60ms ease, opacity 140ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryHover || theme.colors.primary};
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.primarySoft || '#8dd4e4'};
    cursor: not-allowed;
    opacity: 0.85;
  }

  @media (max-width: 767px) {
    min-height: 50px;
    padding: 14px 16px;
    font-size: 16px;
  }
`;

export const SecondaryLink = styled(Link)`
  display: block;
  margin-top: 16px;
  padding-block: 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export const AccentLink = styled(Link)`
  display: block;
  margin-top: 14px;
  padding-block: 4px;
  color: ${({ theme }) => theme.colors.brandAccent || theme.colors.accent};
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryHover || '#008fad'};
  }
`;

export const MutedAction = styled.button`
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const ErrorMessage = styled.div`
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.error};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
`;

export const InfoMessage = styled.div`
  margin-top: 12px;
  color: ${({ $success, theme }) => ($success ? theme.colors.success : theme.colors.textSecondary)};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  font-weight: 500;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border};
  }
`;

export const SocialButton = styled.button`
  display: inline-flex;
  width: 100%;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.backgroundAlt};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  svg, img {
    width: 20px;
    height: 20px;
  }

  @media (max-width: 767px) {
    min-height: 48px;
    padding: 12px 14px;
    font-size: 14px;
  }
`;

export const LanguageSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 16px;
`;

export const LanguageLabel = styled.div`
  margin-bottom: 10px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
`;

export const LanguageSelector = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

export const FlagButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: 2px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : 'transparent')};
  border-radius: 10px;
  background: ${({ $selected, theme }) => ($selected ? theme.colors.primarySoft || '#e0f7fa' : theme.colors.inputBg)};
  cursor: pointer;
`;

export const FlagImage = styled.img`
  width: 38px;
  height: 24px;
  object-fit: contain;

  @media (max-width: 767px) {
    width: 32px;
  }
`;

export const FLAGS = {
  es: flagEs,
  en: flagEn,
};

export const CodeRow = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 52px));
  justify-content: center;
  gap: 10px;
  margin: 0 0 28px;

  @media (max-width: 430px) {
    grid-template-columns: repeat(6, minmax(0, 42px));
    gap: 7px;
  }
`;

export const CodeInput = styled.input`
  width: 52px;
  height: 62px;
  border: 2px solid ${({ $filled, theme }) => ($filled ? (theme.colors.primary || theme.colors.accent) : theme.colors.inputBorder)};
  border-radius: 12px;
  background: ${({ $filled, theme }) => ($filled ? theme.colors.primarySoft || '#e0f7fa' : theme.colors.inputBg)};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 26px;
  font-weight: 700;
  text-align: center;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.borderFocus || theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  @media (max-width: 430px) {
    width: 42px;
    height: 54px;
    font-size: 22px;
  }
`;
