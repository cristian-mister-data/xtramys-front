import { Outlet, Link } from 'react-router-dom';
import styled from 'styled-components';
import { MdLightMode, MdDarkMode } from 'react-icons/md';
import { useThemeMode } from '@/theme/ThemeContext.jsx';
import xtramysLogo from '@/images/xtramys.webp';

const Wrap = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 20% 20%, ${({ theme }) => theme.colors.primary}22 0%, transparent 60%),
    radial-gradient(circle at 80% 80%, ${({ theme }) => theme.colors.secondary}22 0%, transparent 60%),
    ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  padding: 24px;
  position: relative;
  transition: background-color 200ms ease, color 200ms ease;
`;

const Card = styled.main`
  width: 100%;
  max-width: 480px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 32px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const Brand = styled(Link)`
  position: absolute;
  top: 18px;
  left: 22px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.3px;

  img { width: 28px; height: 28px; }
`;

const ThemeToggle = styled.button`
  position: absolute;
  top: 14px;
  right: 18px;
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 120ms ease;
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

export default function AuthLayout() {
  const { mode, toggleTheme } = useThemeMode();
  return (
    <Wrap>
      <Brand to="/">
        <img src={xtramysLogo} alt="Xtramys" />
        Xtramys
      </Brand>
      <ThemeToggle
        onClick={toggleTheme}
        aria-label={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      >
        {mode === 'dark' ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
      </ThemeToggle>
      <Card>
        <Outlet />
      </Card>
    </Wrap>
  );
}
