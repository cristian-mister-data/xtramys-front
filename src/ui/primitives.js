import styled, { css } from 'styled-components';

export const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 32px;
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

export const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 24px;
  color: ${({ theme }) => theme.colors.text};
`;

export const Subtitle = styled.p`
  margin: 0 0 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
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

export const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  transition: border-color 0.15s;
  font-size: 14px;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  font-family: inherit;
  font-size: 14px;
  min-height: 90px;
  resize: vertical;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

export const Button = styled.button`
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-weight: 600;
  font-size: 14px;
  transition: transform 0.05s, opacity 0.15s, background 0.15s;
  border: 1px solid transparent;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:not(:disabled):active { transform: translateY(1px); }

  ${({ $variant = 'primary', theme }) =>
    $variant === 'primary'
      ? css`
          background: ${theme.colors.primary};
          color: #fff;
          &:hover:not(:disabled) { background: ${theme.colors.primaryLight}; }
        `
      : $variant === 'secondary'
        ? css`
            background: ${theme.colors.surface};
            color: ${theme.colors.text};
            border-color: ${theme.colors.border};
            &:hover:not(:disabled) { background: ${theme.colors.backgroundAlt}; }
          `
        : $variant === 'danger'
          ? css`
              background: ${theme.colors.error};
              color: #fff;
              &:hover:not(:disabled) { opacity: 0.9; }
            `
          : css`
              background: transparent;
              color: ${theme.colors.primary};
              &:hover:not(:disabled) { text-decoration: underline; }
            `}
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ $gap = 12 }) => `${$gap}px`};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
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
  color: ${({ theme }) => theme.colors.text};
`;
