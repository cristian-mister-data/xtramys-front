import { useEffect, useMemo, useRef, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { MdSearch, MdAdd, MdClose, MdCheck, MdShield, MdImage } from 'react-icons/md';
import Modal from '@/ui/Modal';
import ImageCropper from '@/components/season/ImageCropper';
import { Button, Field, Label, Input, Row, Stack, Muted } from '@/ui/primitives';
import { fetchRivalsByTeam, createRival } from '@/store/slices/rival/rivalThunks';
import { toast } from '@/ui/toast';

const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.inputBorder};
  background: ${({ theme }) => theme.colors.inputBg};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: ${({ $empty, theme }) => ($empty ? theme.colors.textMuted : theme.colors.text)};
  transition: border-color 0.15s ease, background 0.15s ease;
  &:hover { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const Crest = styled.div`
  width: 32px; height: 32px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
  flex-shrink: 0;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const SearchBox = styled.div`
  position: relative;
  margin-bottom: 10px;
  svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: ${({ theme }) => theme.colors.textMuted}; }
  input { padding-left: 32px; }
`;

const RivalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
`;

const RivalRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: ${({ $selected, theme }) => ($selected ? theme.colors.primarySoft : 'transparent')};
  border: 1px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
  transition: background 0.15s ease, border-color 0.15s ease;
  &:hover { background: ${({ $selected, theme }) => ($selected ? theme.colors.primarySoft : theme.colors.surfaceAlt)}; }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const ImagePicker = styled.label`
  display: flex; align-items: center; justify-content: center;
  width: 80px; height: 80px;
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  overflow: hidden;
  position: relative;
  img { width: 100%; height: 100%; object-fit: cover; }
  input { display: none; }
`;

export default function RivalSelector({
  selectedRivalId,
  selectedRivalName,
  selectedRivalCrest,
  teamId,
  onSelect,
  placeholder,
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const rivals = useSelector((s) => s.rival?.rivals || []);
  const userId = useSelector((s) => s.usuario?.data?._id);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCrest, setNewCrest] = useState(null);
  const [cropperSrc, setCropperSrc] = useState(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open && teamId && !rivals.length) {
      dispatch(fetchRivalsByTeam({ teamId }));
    }
  }, [open, teamId, rivals.length, dispatch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rivals.filter((r) => !q || (r.nombre || '').toLowerCase().includes(q));
  }, [rivals, search]);

  const exactMatch = useMemo(
    () => rivals.find((r) => (r.nombre || '').toLowerCase() === search.trim().toLowerCase()),
    [rivals, search]
  );

  const handleSelect = (rival) => {
    onSelect?.({
      rivalId: rival._id,
      rival: rival.nombre,
      rivalEscudo: rival.escudo || null,
    });
    setOpen(false);
  };

  const handleManual = () => {
    onSelect?.({ rivalId: null, rival: search.trim(), rivalEscudo: null });
    setOpen(false);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropperSrc(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error(t('matchSheet.rivalNameRequired', 'Nombre requerido'));
      return;
    }
    setCreating(true);
    try {
      const res = await dispatch(
        createRival({
          nombre: newName.trim(),
          escudo: newCrest,
          equipo: teamId,
          usuario: userId,
        })
      ).unwrap();
      toast.success(t('matchSheet.rivalCreated', 'Rival creado'));
      onSelect?.({
        rivalId: res._id,
        rival: res.nombre,
        rivalEscudo: res.escudo || null,
      });
      setCreateOpen(false);
      setOpen(false);
      setNewName('');
      setNewCrest(null);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : t('common.error', 'Error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Trigger type="button" $empty={!selectedRivalName} onClick={() => setOpen(true)}>
        <Crest>
          {selectedRivalCrest ? (
            <img src={selectedRivalCrest} alt="" />
          ) : (
            <MdShield size={20} color={theme.colors.textMuted} />
          )}
        </Crest>
        <span style={{ flex: 1 }}>
          {selectedRivalName || placeholder || t('matchSheet.selectRival', 'Selecciona rival')}
        </span>
      </Trigger>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('matchSheet.selectRival', 'Selecciona rival')}
        width={480}
        footer={
          <Row style={{ justifyContent: 'space-between', width: '100%' }}>
            {search.trim() && !exactMatch ? (
              <Button type="button" $variant="ghost" onClick={handleManual}>
                {t('matchSheet.useManual', 'Usar')} &quot;{search.trim()}&quot;
              </Button>
            ) : <span />}
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <MdAdd /> {t('matchSheet.newRival', 'Nuevo rival')}
            </Button>
          </Row>
        }
      >
        <SearchBox>
          <MdSearch size={18} />
          <Input
            placeholder={t('common.search', 'Buscar...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchBox>
        {filtered.length === 0 ? (
          <Muted style={{ textAlign: 'center', padding: 16 }}>
            {t('matchSheet.noRivals', 'No hay rivales')}
          </Muted>
        ) : (
          <RivalList>
            {filtered.map((r) => (
              <RivalRow
                key={r._id}
                type="button"
                $selected={r._id === selectedRivalId}
                onClick={() => handleSelect(r)}
              >
                <Crest>
                  {r.escudo ? <img src={r.escudo} alt="" /> : <MdShield size={18} color={theme.colors.textMuted} />}
                </Crest>
                <span style={{ flex: 1, fontWeight: 600 }}>{r.nombre}</span>
                {r._id === selectedRivalId ? <MdCheck color={theme.colors.primary} size={20} /> : null}
              </RivalRow>
            ))}
          </RivalList>
        )}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('matchSheet.newRival', 'Nuevo rival')}
        width={420}
        footer={
          <Row $gap={8}>
            <Button type="button" $variant="ghost" onClick={() => setCreateOpen(false)}>
              <MdClose /> {t('common.cancel', 'Cancelar')}
            </Button>
            <Button type="button" onClick={handleCreate} disabled={creating}>
              {creating ? t('common.saving', 'Guardando...') : t('common.create', 'Crear')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={12}>
          <Row $gap={12}>
            <ImagePicker>
              {newCrest ? <img src={newCrest} alt="" /> : <MdImage size={24} color={theme.colors.textMuted} />}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
            </ImagePicker>
            <Field style={{ flex: 1 }}>
              <Label>{t('matchSheet.rivalName', 'Nombre')}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </Field>
          </Row>
        </Stack>
      </Modal>

      {cropperSrc ? (
        <ImageCropper
          src={cropperSrc}
          title={t('rivals.adjustShield', 'Ajustar escudo')}
          onConfirm={(dataUrl) => {
            setNewCrest(dataUrl);
            setCropperSrc(null);
          }}
          onCancel={() => setCropperSrc(null)}
        />
      ) : null}
    </>
  );
}
