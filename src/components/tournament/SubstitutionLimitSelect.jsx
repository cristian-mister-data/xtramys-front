import { useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button, Input, Row, Stack } from '@/ui/primitives';
import { parseSubstitutionLimit } from '@/utils/substitutionLimit';

const Dropdown = styled.div`
  position: relative;
  flex: 1;
  min-width: 120px;
`;
const Menu = styled.div`
  position: absolute;
  z-index: 2;
  top: calc(100% + 4px);
  width: 100%;
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;
const Options = styled.div`
  max-height: 180px;
  overflow-y: auto;
  margin-top: 6px;
`;

export default function SubstitutionLimitSelect({ value, onChange, defaultValue = '5' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const lastNumber = useRef(defaultValue);
  const listId = useId();
  const unlimited = value === 'infinito';
  const numericValue = parseSubstitutionLimit(value);

  useEffect(() => {
    if (typeof numericValue === 'number') lastNumber.current = String(numericValue);
    if (unlimited) setOpen(false);
  }, [numericValue, unlimited]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const searchNumber = parseSubstitutionLimit(search);
  const numbers = search ? (typeof searchNumber === 'number' ? [searchNumber] : []) : Array.from({ length: 51 }, (_, number) => number);
  const select = (number) => {
    onChange(String(number));
    setOpen(false);
  };

  return (
    <Row $gap={10} $wrap style={{ alignItems: 'center' }}>
      <Dropdown ref={ref}>
        <Button type="button" $variant="ghost" disabled={unlimited} aria-label={t('tournaments.allowedSubstitutions')} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => { setSearch(''); setOpen(!open); }}>
          <span>{unlimited ? t('tournaments.unlimitedSubstitutions', 'Ilimitados') : value}</span><span aria-hidden="true">▾</span>
        </Button>
        {open && !unlimited && (
          <Menu onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } }}>
            <Input autoFocus inputMode="numeric" aria-label={t('tournaments.searchSubstitutionNumber', 'Buscar número de cambios')} placeholder={t('tournaments.searchSubstitutionNumber', 'Buscar número de cambios')} value={search} onChange={(event) => setSearch(event.target.value.replace(/\D/g, ''))} onKeyDown={(event) => { if (event.key === 'Enter' && typeof searchNumber === 'number') { event.preventDefault(); select(searchNumber); } }} />
            <Options id={listId} role="listbox" aria-label={t('tournaments.allowedSubstitutions')}>
              <Stack $gap={2}>
                {numbers.map((number) => <Button key={number} type="button" role="option" aria-selected={String(number) === value} $variant="ghost" onClick={() => select(number)}>{number}</Button>)}
              </Stack>
            </Options>
          </Menu>
        )}
      </Dropdown>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
        <input type="checkbox" checked={unlimited} onChange={(event) => onChange(event.target.checked ? 'infinito' : lastNumber.current)} />
        {t('tournaments.unlimitedSubstitutions', 'Ilimitados')}
      </label>
    </Row>
  );
}
