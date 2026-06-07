import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdMenu, MdSearch, MdArrowForward } from 'react-icons/md';
import { useThemeMode } from '@/theme/ThemeContext.jsx';
import { preloadRoute } from '@/router/preload';
import { getFlatNavItems, searchNav, normalize } from './navItems';
import xtramysLogo from '@/images/xtramys.webp';
import xtramysWhiteLogo from '@/images/xtramys_white.webp';

const Bar = styled.header`
  grid-area: header;
  background: ${({ theme }) => theme.colors.headerBg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.headerBorder};
  color: ${({ theme }) => theme.colors.headerText};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  height: 60px;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  position: sticky;
  top: 0;
  transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease;

  @media (max-width: 600px) {
    height: 56px;
    padding: 0 12px;
    gap: 8px;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    background: ${({ theme }) =>
    theme.mode === 'dark'
      ? `${theme.colors.headerBg}d8`
      : `${theme.colors.headerBg}f0`};
    box-shadow: 0 1px 0 ${({ theme }) => theme.colors.headerBorder},
                0 2px 12px rgba(0, 0, 0, 0.07);
  }
`;

const IconBtn = styled.button`
  appearance: none;
  -webkit-appearance: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text};
  background: transparent;
  transition: background-color 120ms ease;

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const Burger = styled(IconBtn)`
  display: none;
  @media (max-width: 1280px) {
    display: inline-flex;
  }
`;

const Brand = styled(Link)`
  display: none;
  font-weight: 700;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.primary};
  letter-spacing: 0.3px;

  @media (max-width: 1280px) and (min-width: 701px) {
    display: inline-flex;
  }
`;

/* Mobile center: logo only. Shown only on < 701px */
const MobileCenter = styled.div`
  display: none;

  @media (max-width: 700px) {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    justify-content: center;
    min-width: 0;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    max-width: calc(100% - 160px);
    pointer-events: none;
  }
`;

const MobileLogo = styled.img`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
`;

const Spacer = styled.div`
  flex: 1;

  @media (max-width: 700px) {
    display: none;
  }
`;

const RightActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
`;

/* ---------- Search ---------- */

const SearchWrap = styled.div`
  position: relative;
  width: min(420px, 40vw);

  @media (max-width: 700px) {
    display: none;
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.borderFocus};
    background: ${({ theme }) => theme.colors.surface};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    outline: none;
    font-size: 13.5px;
    color: ${({ theme }) => theme.colors.text};
    &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }
  }
`;

const Kbd = styled.kbd`
  font-family: ${({ theme }) => theme.fonts.mono || 'ui-monospace, SFMono-Regular, Menlo, monospace'};
  font-size: 11px;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg || theme.shadows.md};
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  overflow: hidden;
  max-height: min(60vh, 480px);
  overflow-y: auto;
`;

const ResultRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  background: ${({ $active, theme }) => ($active ? theme.colors.backgroundAlt : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  border: 0;
  cursor: pointer;
  transition: background-color 100ms ease;

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }

  svg.lead {
    color: ${({ theme }) => theme.colors.textMuted};
    flex-shrink: 0;
  }
  svg.trail {
    margin-left: auto;
    color: ${({ theme }) => theme.colors.textMuted};
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transition: opacity 100ms ease;
  }
`;

const ResultMeta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
`;

const ResultLabel = styled.span`
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  mark {
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primarySoftText};
    padding: 0 2px;
    border-radius: 3px;
  }
`;

const ResultSection = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const EmptyState = styled.div`
  padding: 16px 14px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
`;

const HintBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  gap: 8px;

  span { display: inline-flex; align-items: center; gap: 6px; }
`;

/* ---------- Profile ---------- */

const Profile = styled.button`
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px 4px 4px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  font-weight: 500;
  transition: background-color 120ms ease, border-color 120ms ease;

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  @media (max-width: 700px) {
    span { display: none; }
  }
`;

const Avatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 11.5px;
  background-image: ${({ src }) => (src ? `url(${src})` : 'none')};
  background-size: cover;
  background-position: center;
`;

/* ---------- Helpers ---------- */

const initials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/**
 * Resalta el primer match del query en el label (case/acento-insensitive),
 * preservando el texto original.
 */
function HighlightedLabel({ text, query }) {
  if (!query) return <>{text}</>;
  const nText = normalize(text);
  const nQuery = normalize(query).trim().split(/\s+/)[0];
  if (!nQuery) return <>{text}</>;
  const idx = nText.indexOf(nQuery);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + nQuery.length)}</mark>
      {text.slice(idx + nQuery.length)}
    </>
  );
}

/* ---------- Component ---------- */

export default function Header({ onMenu }) {
  const { t } = useTranslation();
  const user = useSelector((s) => s.usuario.user);
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const allItems = useMemo(() => getFlatNavItems(t), [t]);
  const results = useMemo(() => searchNav(allItems, query, 8), [allItems, query]);

  // Reset índice activo al cambiar resultados
  useEffect(() => { setActiveIdx(0); }, [query]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Atajo `/` o Cmd/Ctrl+K para enfocar
  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.key === '/' && !isTyping) || ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goTo = useCallback((to) => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(to);
  }, [navigate]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (query) setQuery('');
      else { setOpen(false); inputRef.current?.blur(); }
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIdx];
      if (target) goTo(target.to);
    }
  };

  const showDropdown = open && (query.trim().length > 0);

  return (
    <Bar style={{ position: 'relative' }}>
      <Burger onClick={onMenu} aria-label={t('common.menu', 'Menú')}>
        <MdMenu size={22} />
      </Burger>
      <Brand to="/">Xtramys</Brand>

      {/* Mobile center: just the logo, centered */}
      <MobileCenter aria-hidden="true">
        <MobileLogo src={mode === 'dark' ? xtramysWhiteLogo : xtramysLogo} alt="" />
      </MobileCenter>

      <SearchWrap ref={wrapRef}>
        <SearchBox>
          <MdSearch size={18} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t('common.searchPlaceholder', 'Buscar páginas… (pulsa /)')}
            aria-label={t('common.search', 'Buscar')}
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="header-search-results"
            role="combobox"
          />
          {!query && <Kbd aria-hidden>/</Kbd>}
        </SearchBox>

        {showDropdown && (
          <Dropdown id="header-search-results" role="listbox">
            {results.length === 0 ? (
              <EmptyState>
                {t('common.noResults', 'Sin resultados para')} “{query}”
              </EmptyState>
            ) : (
              results.map((it, i) => {
                const Icon = it.Icon;
                const active = i === activeIdx;
                return (
                  <ResultRow
                    key={it.to}
                    role="option"
                    aria-selected={active}
                    $active={active}
                    onMouseEnter={() => { setActiveIdx(i); preloadRoute(it.to); }}
                    onFocus={() => preloadRoute(it.to)}
                    onClick={() => goTo(it.to)}
                  >
                    <Icon size={18} className="lead" />
                    <ResultMeta>
                      <ResultLabel>
                        <HighlightedLabel text={it.label} query={query} />
                      </ResultLabel>
                      {it.section && <ResultSection>{it.section}</ResultSection>}
                    </ResultMeta>
                    <MdArrowForward size={14} className="trail" />
                  </ResultRow>
                );
              })
            )}
            <HintBar>
              <span><Kbd>↑</Kbd><Kbd>↓</Kbd> {t('common.navigate', 'navegar')}</span>
              <span><Kbd>↵</Kbd> {t('common.open', 'abrir')}</span>
              <span><Kbd>Esc</Kbd> {t('common.close', 'cerrar')}</span>
            </HintBar>
          </Dropdown>
        )}
      </SearchWrap>

      <RightActions>
        <Profile onClick={() => navigate('/profile')} aria-label={t('menu.profile', 'Perfil')}>
          <Avatar src={user?.imagen}>{!user?.imagen && initials(user?.nombre)}</Avatar>
          <span>{user?.nombre || ''}</span>
        </Profile>
      </RightActions>
    </Bar>
  );
}
