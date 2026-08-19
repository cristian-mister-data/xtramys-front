import styled, { css } from 'styled-components';

export const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 32px;
  box-shadow: ${({ theme }) => theme.shadows.md};
  color: ${({ theme }) => theme.colors.text};
`;

export const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.01em;
`;

export const Subtitle = styled.p`
  margin: 0 0 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  line-height: 1.5;
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
`;

export const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const inputBase = css`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.inputBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  font-size: 14px;
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.colors.inputPlaceholder};
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:focus,
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.borderFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme }) => theme.colors.textDisabled};
    cursor: not-allowed;
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.error};
    &:focus {
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.errorSoft};
    }
  }
`;

export const Input = styled.input`${inputBase}`;
export const TextArea = styled.textarea`
  ${inputBase}
  min-height: 90px;
  resize: vertical;
`;
export const Select = styled.select`
  ${inputBase}
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px 16px;
  padding-right: 38px;
  cursor: pointer;

  option {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    padding: 10px;
  }
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-weight: 600;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.2;
  cursor: pointer;
  transition: transform 0.05s ease, opacity 0.15s ease,
    background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  border: 1px solid transparent;
  white-space: nowrap;
  min-width: 0;

  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:not(:disabled):active { transform: translateY(1px); }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  ${({ $variant = 'primary', theme }) => {
    if ($variant === 'primary') {
      return css`
        background: ${theme.colors.primary};
        color: ${theme.colors.onPrimary};
        &:hover:not(:disabled) { background: ${theme.colors.primaryHover}; }
        &:active:not(:disabled) { background: ${theme.colors.primaryActive}; }
      `;
    }
    if ($variant === 'secondary') {
      return css`
        background: ${theme.colors.surface};
        color: ${theme.colors.text};
        border-color: ${theme.colors.border};
        &:hover:not(:disabled) {
          background: ${theme.colors.backgroundAlt};
          border-color: ${theme.colors.borderStrong};
        }
      `;
    }
    if ($variant === 'danger') {
      return css`
        background: ${theme.colors.error};
        color: ${theme.colors.onError};
        &:hover:not(:disabled) { filter: brightness(1.08); }
      `;
    }
    if ($variant === 'success') {
      return css`
        background: ${theme.colors.success};
        color: ${theme.colors.onSuccess};
        &:hover:not(:disabled) { filter: brightness(1.08); }
      `;
    }
    if ($variant === 'ghost') {
      return css`
        background: transparent;
        color: ${theme.colors.text};
        &:hover:not(:disabled) { background: ${theme.colors.backgroundAlt}; }
      `;
    }
    // link
    return css`
      background: transparent;
      color: ${theme.colors.primary};
      padding: 4px 8px;
      &:hover:not(:disabled) { text-decoration: underline; }
    `;
  }}

  @media (max-width: 600px) {
    white-space: normal;
    padding: 10px 12px;
  }
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ $gap = 12 }) => `${$gap}px`};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
  min-width: 0;

  @media (max-width: 600px) {
    max-width: 100%;
  }
`;

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap = 12 }) => `${$gap}px`};
`;

export const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: 13px;
  margin-top: 4px;
`;

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.01em;
`;

// Badge / pill para estados (semántica accesible).
export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;

  ${({ $tone = 'neutral', theme }) => {
    const map = {
      neutral: { bg: theme.colors.backgroundAlt, fg: theme.colors.textSecondary },
      primary: { bg: theme.colors.primarySoft, fg: theme.colors.primarySoftText },
      success: { bg: theme.colors.successSoft, fg: theme.colors.successSoftText },
      warning: { bg: theme.colors.warningSoft, fg: theme.colors.warningSoftText },
      error:   { bg: theme.colors.errorSoft,   fg: theme.colors.errorSoftText },
      info:    { bg: theme.colors.infoSoft,    fg: theme.colors.infoSoftText },
    };
    const { bg, fg } = map[$tone] || map.neutral;
    return css`background: ${bg}; color: ${fg};`;
  }}
`;

// Divider visual sutil
export const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  margin: ${({ $vertical }) => ($vertical ? '0 12px' : '12px 0')};
  ${({ $vertical }) => $vertical && 'width: 1px; height: auto; align-self: stretch;'}
`;
