// Página Rivales — adapta misterdata-source/src/components/pages/rivals.js a React DOM.
// CRUD de equipos rivales asociados al equipo seleccionado del usuario:
// - Grid de cards (escudo + nombre)
// - Filtro por nombre
// - Modal crear/editar con upload de escudo (FileReader → base64)
// - Modal de detalles
// - Confirmación de borrado
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdShield,
  MdClose,
  MdImage,
  MdGroups,
} from 'react-icons/md';

import {
  fetchRivalsByTeam,
  createRival,
  updateRival,
  deleteRival,
} from '../../store/slices/rival/rivalThunks';
import {
  PageHeader,
  PageTitle,
  Button,
  Input,
  Field,
  Label,
  Stack,
  Row,
  Muted,
  ErrorText,
} from '../../ui/primitives';
import Modal from '../../ui/Modal';
import { toast } from '../../ui/toast';
import { confirmAction } from '../../ui/confirm';

// ---------- styles ----------
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 8px 12px;
  flex: 1;
  min-width: 220px;

  input {
    border: none;
    outline: none;
    background: transparent;
    flex: 1;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
`;

// Usamos div con role=button para evitar anidar <button> (IconBtn) dentro de <button>.
const RivalCardEl = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 16px 12px 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.15s, border-color 0.15s;
  text-align: center;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const EscudoBox = styled.div`
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};

  img { max-width: 100%; max-height: 100%; object-fit: contain; }
`;

const RivalName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  word-break: break-word;
`;

const CardActions = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0.8;
`;

const IconBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme, $danger }) => ($danger ? theme.colors.error : theme.colors.text)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${({ theme, $danger }) => ($danger ? '#fee2e2' : theme.colors.border)};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 24px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const EscudoPreview = styled.div`
  width: 140px;
  height: 140px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  align-self: center;

  img { max-width: 100%; max-height: 100%; object-fit: contain; }
`;

const DetailEscudo = styled.div`
  width: 220px;
  height: 220px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;

  img { max-width: 100%; max-height: 100%; object-fit: contain; }
`;

// ---------- component ----------
export default function Rivals() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const rivals = useSelector((s) => s.rival.rivals || []);
  const loading = useSelector((s) => s.rival.loading);
  const equipos = useSelector((s) => s.team.teams || []);
  const userId = useSelector((s) => s.usuario.data?._id);

  const selectedTeam = useMemo(
    () => equipos.find((e) => e.seleccionado === true),
    [equipos]
  );

  const [filterName, setFilterName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nombre, setNombre] = useState('');
  const [escudo, setEscudo] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    if (selectedTeam?._id) {
      dispatch(fetchRivalsByTeam({ teamId: selectedTeam._id }));
    }
  }, [selectedTeam, dispatch]);

  const filtered = useMemo(() => {
    const q = filterName.trim().toLowerCase();
    if (!q) return rivals;
    return rivals.filter((r) => (r.nombre || '').toLowerCase().includes(q));
  }, [rivals, filterName]);

  const openCreate = () => {
    setEditing(null);
    setNombre('');
    setEscudo('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (rival) => {
    setEditing(rival);
    setNombre(rival.nombre || '');
    setEscudo(rival.escudo || '');
    setFormError('');
    setModalOpen(true);
    setViewing(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setNombre('');
    setEscudo('');
    setFormError('');
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('rivals.invalidImage', 'Selecciona una imagen válida'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEscudo(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      setFormError(t('rivals.nameRequired', 'El nombre es obligatorio'));
      return;
    }
    if (!selectedTeam?._id) {
      toast.error(t('rivals.noTeamSelected', 'No hay equipo seleccionado'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        nombre: nombre.trim(),
        escudo: escudo || '',
        equipo: selectedTeam._id,
        usuario: userId,
      };
      if (editing) {
        await dispatch(updateRival({ ...payload, _id: editing._id })).unwrap();
        toast.success(t('rivals.updateSuccess', 'Rival actualizado'));
      } else {
        await dispatch(createRival(payload)).unwrap();
        toast.success(t('rivals.createSuccess', 'Rival creado'));
      }
      closeModal();
      dispatch(fetchRivalsByTeam({ teamId: selectedTeam._id }));
    } catch (err) {
      toast.error(err?.message || t('rivals.saveError', 'Error al guardar'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rival) => {
    const ok = await confirmAction(
      t('rivals.deleteMessage', '¿Eliminar el rival "{{name}}"?', { name: rival.nombre })
    );
    if (!ok) return;
    try {
      await dispatch(deleteRival(rival._id)).unwrap();
      toast.success(t('rivals.deleteSuccess', 'Rival eliminado'));
      setViewing(null);
    } catch (err) {
      toast.error(err?.message || t('rivals.deleteError', 'Error al eliminar'));
    }
  };

  if (!selectedTeam) {
    return (
      <Container>
        <PageHeader>
          <PageTitle>{t('rivals.title', 'Rivales')}</PageTitle>
        </PageHeader>
        <EmptyState>
          <MdGroups size={56} />
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {t('rivals.noTeamSelected', 'No hay equipo seleccionado')}
          </div>
          <Muted>
            {t(
              'rivals.noTeamSelectedSubtitle',
              'Selecciona un equipo para ver y gestionar sus rivales.'
            )}
          </Muted>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader>
        <PageTitle>{t('rivals.title', 'Rivales')}</PageTitle>
        <Row $gap={8}>
          <Button $variant="primary" onClick={openCreate}>
            <Row $gap={6}>
              <MdAdd size={18} />
              {t('rivals.add', 'Añadir rival')}
            </Row>
          </Button>
        </Row>
      </PageHeader>

      <Row $gap={8} $wrap>
        <SearchBar>
          <MdSearch size={18} />
          <input
            type="text"
            placeholder={t('rivals.searchPlaceholder', 'Buscar por nombre…')}
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
        </SearchBar>
        <Muted>
          {filtered.length} / {rivals.length}
        </Muted>
      </Row>

      {loading && rivals.length === 0 ? (
        <Muted>{t('rivals.loading', 'Cargando rivales…')}</Muted>
      ) : filtered.length === 0 ? (
        <EmptyState>
          <MdShield size={56} />
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {rivals.length === 0
              ? t('rivals.empty', 'Aún no has añadido rivales')
              : t('rivals.noResults', 'Sin resultados para esa búsqueda')}
          </div>
          {rivals.length === 0 && (
            <Button $variant="primary" onClick={openCreate}>
              <Row $gap={6}>
                <MdAdd size={18} />
                {t('rivals.addFirst', 'Añadir el primero')}
              </Row>
            </Button>
          )}
        </EmptyState>
      ) : (
        <Grid>
          {filtered.map((rival) => (
            <RivalCardEl
              key={rival._id}
              role="button"
              tabIndex={0}
              onClick={() => setViewing(rival)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setViewing(rival);
                }
              }}
            >
              <CardActions>
                <IconBtn
                  type="button"
                  title={t('common.edit', 'Editar')}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(rival);
                  }}
                >
                  <MdEdit size={16} />
                </IconBtn>
                <IconBtn
                  type="button"
                  $danger
                  title={t('common.delete', 'Eliminar')}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(rival);
                  }}
                >
                  <MdDelete size={16} />
                </IconBtn>
              </CardActions>
              <EscudoBox>
                {rival.escudo ? (
                  <img src={rival.escudo} alt={rival.nombre} />
                ) : (
                  <MdShield size={48} color="#94a3b8" />
                )}
              </EscudoBox>
              <RivalName>{rival.nombre}</RivalName>
            </RivalCardEl>
          ))}
        </Grid>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editing
            ? t('rivals.editTitle', 'Editar rival')
            : t('rivals.createTitle', 'Nuevo rival')
        }
        width={460}
        footer={
          <Row $gap={8}>
            <Button $variant="secondary" onClick={closeModal} disabled={saving}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button $variant="primary" onClick={handleSave} disabled={saving}>
              {saving
                ? t('common.saving', 'Guardando…')
                : t('common.save', 'Guardar')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={14}>
          <Field>
            <Label>{t('rivals.name', 'Nombre')}</Label>
            <Input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={t('rivals.namePlaceholder', 'Nombre del equipo rival')}
              autoFocus
            />
            {formError && <ErrorText>{formError}</ErrorText>}
          </Field>

          <Field>
            <Label>{t('rivals.escudo', 'Escudo')}</Label>
            <EscudoPreview>
              {escudo ? (
                <img src={escudo} alt="escudo" />
              ) : (
                <MdImage size={48} color="#94a3b8" />
              )}
            </EscudoPreview>
            <Row $gap={8} style={{ marginTop: 8, justifyContent: 'center' }}>
              <Button $variant="secondary" type="button" onClick={handlePickImage}>
                {escudo
                  ? t('rivals.changeImage', 'Cambiar imagen')
                  : t('rivals.uploadImage', 'Subir imagen')}
              </Button>
              {escudo && (
                <Button
                  $variant="ghost"
                  type="button"
                  onClick={() => setEscudo('')}
                >
                  {t('common.remove', 'Quitar')}
                </Button>
              )}
            </Row>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </Field>
        </Stack>
      </Modal>

      {/* Modal detalle */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={t('rivals.detailsTitle', 'Detalles del rival')}
        width={460}
        footer={
          <Row $gap={8}>
            <Button $variant="secondary" onClick={() => setViewing(null)}>
              <Row $gap={6}>
                <MdClose size={16} />
                {t('common.close', 'Cerrar')}
              </Row>
            </Button>
            {viewing && (
              <>
                <Button $variant="danger" onClick={() => handleDelete(viewing)}>
                  <Row $gap={6}>
                    <MdDelete size={16} />
                    {t('common.delete', 'Eliminar')}
                  </Row>
                </Button>
                <Button $variant="primary" onClick={() => openEdit(viewing)}>
                  <Row $gap={6}>
                    <MdEdit size={16} />
                    {t('common.edit', 'Editar')}
                  </Row>
                </Button>
              </>
            )}
          </Row>
        }
      >
        {viewing && (
          <Stack $gap={14}>
            <Row $gap={10} style={{ justifyContent: 'center' }}>
              <MdShield size={22} />
              <div style={{ fontSize: 18, fontWeight: 700 }}>{viewing.nombre}</div>
            </Row>
            <DetailEscudo>
              {viewing.escudo ? (
                <img src={viewing.escudo} alt={viewing.nombre} />
              ) : (
                <MdShield size={120} color="#94a3b8" />
              )}
            </DetailEscudo>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
