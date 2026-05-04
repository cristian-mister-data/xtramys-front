import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import xtramysLogo from '@/images/xtramys.webp';
import flagEs from '@/images/spain.png';
import flagEn from '@/images/united-kingdom.png';

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
  color: ${BRAND_TEXT};

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
  flex-direction: column;
  align-items: center;
  margin-bottom: ${({ $compact }) => ($compact ? '16px' : '28px')};
`;

const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ $compact }) => ($compact ? '8px' : '14px')};
  background: #ffffff;
  border-radius: ${({ $compact }) => ($compact ? '18px' : '20px')};
  box-shadow: 0 10px 30px rgba(26, 42, 58, 0.12);
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
  color: ${BRAND_PRIMARY};
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
  background: ${BRAND_CARD_BG};
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  box-shadow: 0 14px 42px rgba(26, 42, 58, 0.1);

  @media (max-width: 767px) {
    padding: ${({ $compact }) => ($compact ? '20px' : '24px')};
  }
`;

export function AuthFormShell({ children, maxWidth = '480px', compact = false, showBrandName = true }) {
  return (
    <Shell $compact={compact}>
      <LogoHeader $compact={compact}>
        <LogoWrapper $compact={compact}>
          <LogoImage src={xtramysLogo} alt="Xtramys" $compact={compact} />
        </LogoWrapper>
      </LogoHeader>
      <AuthCard $maxWidth={maxWidth} $compact={compact}>{children}</AuthCard>
    </Shell>
  );
}

export const FormTitle = styled.h1`
  margin: 0 0 6px;
  color: ${BRAND_TEXT};
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
  color: ${BRAND_TEXT_LIGHT};
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
  color: ${BRAND_TEXT_LIGHT};
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
  border: 1.5px solid ${BRAND_BORDER};
  border-radius: 12px;
  background: ${BRAND_INPUT_BG};
  color: ${BRAND_TEXT};
  font: inherit;
  font-size: 16px;
  outline: none;
  transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;

  &::placeholder {
    color: ${BRAND_TEXT_LIGHT};
  }

  &:focus {
    border-color: ${BRAND_ACCENT};
    box-shadow: 0 0 0 4px rgba(0, 180, 216, 0.12);
  }

  &[aria-invalid='true'] {
    border-color: ${BRAND_ERROR};
    background: #fef2f2;
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
  background: ${BRAND_ACCENT};
  color: #ffffff;
  font: inherit;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(0, 180, 216, 0.3);
  transition: background-color 140ms ease, transform 60ms ease, opacity 140ms ease;

  &:hover:not(:disabled) {
    background: #009fc0;
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    background: #8dd4e4;
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
  color: ${BRAND_TEXT_LIGHT};
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;

  &:hover {
    color: ${BRAND_PRIMARY};
  }
`;

export const AccentLink = styled(Link)`
  display: block;
  margin-top: 14px;
  padding-block: 4px;
  color: ${BRAND_ACCENT};
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;

  &:hover {
    color: #008fad;
  }
`;

export const MutedAction = styled.button`
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: ${BRAND_TEXT_LIGHT};
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${BRAND_PRIMARY};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const ErrorMessage = styled.div`
  margin-top: 12px;
  color: ${BRAND_ERROR};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
`;

export const InfoMessage = styled.div`
  margin-top: 12px;
  color: ${({ $success }) => ($success ? BRAND_SUCCESS : BRAND_TEXT_LIGHT)};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
`;

export const LanguageSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 16px;
`;

export const LanguageLabel = styled.div`
  margin-bottom: 10px;
  color: ${BRAND_TEXT_LIGHT};
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
  border: 2px solid ${({ $selected }) => ($selected ? BRAND_ACCENT : 'transparent')};
  border-radius: 10px;
  background: ${({ $selected }) => ($selected ? '#e0f7fa' : BRAND_INPUT_BG)};
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
  border: 2px solid ${({ $filled }) => ($filled ? BRAND_ACCENT : BRAND_BORDER)};
  border-radius: 12px;
  background: ${({ $filled }) => ($filled ? '#e0f7fa' : BRAND_INPUT_BG)};
  color: ${BRAND_TEXT};
  font: inherit;
  font-size: 26px;
  font-weight: 700;
  text-align: center;
  outline: none;

  &:focus {
    border-color: ${BRAND_ACCENT};
    box-shadow: 0 0 0 4px rgba(0, 180, 216, 0.12);
  }

  @media (max-width: 430px) {
    width: 42px;
    height: 54px;
    font-size: 22px;
  }
`;
