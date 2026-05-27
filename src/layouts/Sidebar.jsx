import { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { MdLogout } from 'react-icons/md';
import { logoutThunk } from '@/store/slices/user/userThunks';
import { preloadRoute } from '@/router/preload';
import { useThemeMode } from '@/theme/ThemeContext';
import xtramysLogo from '@/images/xtramys.webp';
import xtramysWhiteLogo from '@/images/xtramys_white.webp';
import { getNavSections } from './navItems';

const Aside = styled.aside`
  grid-area: sidebar;
  background: ${({ theme }) => theme.colors.sidebarBg};
  border-right: 1px solid ${({ theme }) => theme.colors.sidebarBorder};
  color: ${({ theme }) => theme.colors.sidebarText};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: ${({ theme }) => theme.zIndex.drawer};
  transition: background-color 200ms ease, border-color 200ms ease;

  @media (max-width: 1280px) {
    position: fixed;
    inset: 0 auto 0 0;
    width: 280px;
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    transition: transform 0.2s ease, background-color 200ms ease;
    box-shadow: ${({ $open, theme }) => ($open ? theme.shadows.xl : 'none')};
  }
`;

const Backdrop = styled.div`
  display: none;
  @media (max-width: 1280px) {
    display: ${({ $open }) => ($open ? 'block' : 'none')};
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: ${({ theme }) => theme.zIndex.drawer - 1};
    backdrop-filter: blur(2px);
    animation: fadeIn 0.18s ease-out;
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.sidebarBorder};
`;

const LogoBox = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: grid;
  place-items: center;
  overflow: hidden;
  img { width: 28px; height: 28px; object-fit: contain; }
`;

const BrandText = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.1;
`;

const BrandTitle = styled.span`
  font-weight: 700;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.sidebarBrand};
  letter-spacing: 0.3px;
`;

const BrandSub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.sidebarTextMuted};
  margin-top: 2px;
`;

const Scroll = styled.nav`
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px 12px;
`;

const SectionTitle = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: ${({ theme }) => theme.colors.sidebarSection};
  padding: 16px 12px 6px;
  font-weight: 700;
`;

const itemStyles = css`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.sidebarText};
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  margin: 1px 0;
  position: relative;
  transition: background-color 120ms ease, color 120ms ease;

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.sidebarTextMuted};
    transition: color 120ms ease;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.sidebarItemHover};
    color: ${({ theme }) => theme.colors.text};
    svg { color: ${({ theme }) => theme.colors.text}; }
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  &.active {
    background: ${({ theme }) => theme.colors.sidebarItemActive};
    color: ${({ theme }) => theme.colors.sidebarItemActiveText};
    font-weight: 600;
    svg { color: ${({ theme }) => theme.colors.sidebarItemActiveText}; }
  }

  &.active::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: ${({ theme }) => theme.colors.primary};
  }
`;

const Item = styled(NavLink)`${itemStyles}`;

const Footer = styled.div`
  padding: 12px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.sidebarBorder};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const UserCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.sidebarItemHover};
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
  background-image: ${({ src }) => (src ? `url(${src})` : 'none')};
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
`;

const UserMeta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
`;

const UserName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const LogoutBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.error};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: background-color 120ms ease, border-color 120ms ease;

  &:hover {
    background: ${({ theme }) => theme.colors.errorSoft};
    border-color: ${({ theme }) => theme.colors.error};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const Version = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  letter-spacing: 0.3px;
`;

const initials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.usuario.user);
  const { mode } = useThemeMode();

  const sections = useMemo(
    () => getNavSections(t).filter((s) => !s.hiddenInSidebar),
    [t]
  );

  const handleLogout = async () => {
    onClose && onClose();
    await dispatch(logoutThunk());
    navigate('/auth/welcome', { replace: true });
  };

  const logoImage = mode === 'dark' ? xtramysWhiteLogo : xtramysLogo;

  return (
    <>
      <Backdrop $open={open} onClick={onClose} />
      <Aside $open={open}>
        <Brand>
          <LogoBox>
            <img src={logoImage} alt="Xtramys" />
          </LogoBox>
          <BrandText>
          </BrandText>
        </Brand>

        <Scroll onClick={onClose}>
          {sections.map((section, idx) => (
            <div key={idx}>
              {section.title && <SectionTitle>{section.title}</SectionTitle>}
              {section.items.map(({ to, label, end, Icon }) => (
                <Item
                  key={to}
                  to={to}
                  end={end}
                  onMouseEnter={() => preloadRoute(to)}
                  onFocus={() => preloadRoute(to)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Item>
              ))}
            </div>
          ))}
        </Scroll>

        <Footer>
          <UserCard>
            <Avatar src={user?.imagen}>
              {!user?.imagen && initials(user?.nombre)}
            </Avatar>
            <UserMeta>
              <UserName>{user?.nombre || 'Usuario'}</UserName>
              <UserHint>{user?.email || ''}</UserHint>
            </UserMeta>
          </UserCard>
          <Version>Xtramys v1.0.0</Version>
        </Footer>
      </Aside>
    </>
  );
}
