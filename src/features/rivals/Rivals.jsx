// Página Rivales — adapta misterdata-source/src/components/pages/rivals.js a React DOM.
// CRUD de equipos rivales asociados al equipo seleccionado del usuario:
// - Grid de cards (escudo + nombre)
// - Filtro por nombre
// - Modal crear/editar con upload de escudo (FileReader → base64)
// - Modal de detalles
// - Confirmación de borrado
import { useEffect, useMemo, useRef, useState } from 'react';
import styled, { useTheme } from 'styled-components';
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
  MdDescription,
  MdAnalytics,
  MdOpenInNew,
  MdCalendarToday,
} from 'react-icons/md';

import {
  fetchRivalsByTeam,
  createRival,
  updateRival,
  deleteRival,
} from '../../store/slices/rival/rivalThunks';
import { fetchMatchSheetsByTeam } from '../../store/slices/matchSheet/matchSheetThunks';
import { fetchRivalAnalysesByTeam } from '../../store/slices/rivalAnalysis/rivalAnalysisThunks';
import useSupervision from '../../hooks/useSupervision';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Field,
  Label,
  Stack,
  Row,
  Muted,
} from '../../ui/primitives';
import SectionHeader from '../../ui/SectionHeader';
import Modal, { FORM_MODAL_WIDTH } from '../../ui/Modal';
import { toast } from '../../ui/toast';
import { confirmAction } from '../../ui/confirm';
import ImageCropper from '../../components/season/ImageCropper';
import TeamRequiredCard from '@/components/shared/TeamRequiredCard';
import CanMutate from '@/components/shared/CanMutate';
import { showMissingFieldsToast } from '@/utils/validationToast';

// ---------- styles ----------
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 600px) {
    gap: 12px;
    padding: 12px;
  }
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

  @media (max-width: 600px) {
    width: 100%;
    min-width: 0;
  }

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

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
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

  @media (max-width: 600px) {
    padding: 14px 10px 12px;
    gap: 8px;
    border-radius: ${({ theme }) => theme.radius.md};
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

  @media (max-width: 600px) {
    width: 72px;
    height: 72px;
  }
`;

const RivalName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  word-break: break-word;

  @media (max-width: 600px) {
    font-size: 13px;
  }
`;

const CardActions = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0.8;

  @media (max-width: 600px) {
    position: static;
    order: 3;
    opacity: 1;
  }
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
    background: ${({ theme, $danger }) => ($danger ? theme.colors.errorSoft : theme.colors.border)};
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

  @media (max-width: 600px) {
    padding: 36px 18px;
  }
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

  @media (max-width: 600px) {
    width: min(220px, 70vw);
    height: min(220px, 70vw);
  }
`;

const LinkedSection = styled.div`
  margin-top: 8px;
`;

const LinkedSectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 8px;
`;

const LinkedItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primarySoft};
  }

  span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const LinkedBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ $color }) => $color || '#6366f1'}20;
  color: ${({ $color }) => $color || '#6366f1'};
  flex-shrink: 0;
`;

const EmptyLinked = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 6px 0;
`;

// ---------- component ----------
export default function Rivals() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const navigate = useNavigate();
  const { canMutate } = useSupervision();

  const rivals = useSelector((s) => s.rival.rivals || []);
  const loading = useSelector((s) => s.rival.loading);
  const equipos = useSelector((s) => s.team.teams || []);
  const userId = useSelector((s) => s.usuario.user?._id);
  const matchSheets = useSelector((s) => s.matchSheet?.matchSheets || []);
  const rivalAnalyses = useSelector((s) => s.rivalAnalysis?.rivalAnalyses || []);

  const [filterName, setFilterName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nombre, setNombre] = useState('');
  const [escudo, setEscudo] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [cropperSrc, setCropperSrc] = useState(null);

  const selectedTeam = useMemo(
    () => equipos.find((e) => e.seleccionado === true),
    [equipos]
  );

  useEffect(() => {
    if (selectedTeam?._id) {
      dispatch(fetchRivalsByTeam({ teamId: selectedTeam._id }));
      dispatch(fetchMatchSheetsByTeam(selectedTeam._id));
      dispatch(fetchRivalAnalysesByTeam(selectedTeam._id));
    }
  }, [selectedTeam, dispatch]);

  const filtered = useMemo(() => {
    const q = filterName.trim().toLowerCase();
    if (!q) return rivals;
    return rivals.filter((r) => (r.nombre || '').toLowerCase().includes(q));
  }, [rivals, filterName]);

  const rivalMatchSheets = useMemo(() => {
    if (!viewing?._id) return [];
    return matchSheets.filter((ms) => {
      const rid = ms.rivalId?._id || ms.rivalId;
      return rid === viewing._id;
    });
  }, [matchSheets, viewing]);

  const rivalAnalysesMemos = useMemo(() => {
    if (!viewing?._id) return [];
    return rivalAnalyses.filter((ra) => {
      const rid = ra.rivalId?._id || ra.rivalId;
      return rid === viewing._id;
    });
  }, [rivalAnalyses, viewing]);

  const openCreate = () => {
    setEditing(null);
    setNombre('');
    setEscudo('');
    setModalOpen(true);
  };

  const openEdit = (rival) => {
    setEditing(rival);
    setNombre(rival.nombre || '');
    setEscudo(rival.escudo || '');
    setModalOpen(true);
    setViewing(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setNombre('');
    setEscudo('');
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
    const url = URL.createObjectURL(file);
    setCropperSrc(url);
  };

  const handleCropConfirm = (croppedB64) => {
    setEscudo(croppedB64);
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const handleCropCancel = () => {
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      showMissingFieldsToast(t, [t('rivals.name', 'Nombre')]);
      return;
    }
    if (!selectedTeam?._id) {
      toast.error(t('rivals.noTeamSelected', 'No hay equipo seleccionado'));
      return;
    }
    setSaving(true);
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
        <SectionHeader
          title={t('rivals.title', 'Rivales')}
          subtitle={t('rivals.noTeamSelectedSubtitle', 'Selecciona un equipo para ver y gestionar sus rivales.')}
          icon={MdShield}
        />
        <TeamRequiredCard />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader
        title={t('rivals.title', 'Rivales')}
        subtitle={selectedTeam?.nombre || t('rivals.subtitle', 'Gestión de equipos rivales')}
        icon={MdShield}
        actions={(
          <CanMutate>
            <Row $gap={8}>
            <Button $variant="primary" onClick={openCreate}>
              <Row $gap={6}>
                <MdAdd size={18} />
                {t('rivals.add', 'Añadir rival')}
              </Row>
            </Button>
            </Row>
          </CanMutate>
        )}
      />

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
              ? t('rivals.empty', 'No hay rivales')
              : t('rivals.noResults', 'Sin resultados para esa búsqueda')}
          </div>
          <Muted>
            {rivals.length === 0
              ? t('rivals.createFirstHint', 'Crea tu primer rival para comenzar')
              : t('rivals.tryDifferentFilters', 'Prueba con otros filtros.')}
          </Muted>
          {rivals.length === 0 && (
            <CanMutate>
              <Button $variant="primary" onClick={openCreate}>
              <Row $gap={6}>
                <MdAdd size={18} />
                {t('rivals.createFirst', 'Crear rival')}
              </Row>
              </Button>
            </CanMutate>
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
                {canMutate && (
                  <>
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
                  </>
                )}
              </CardActions>
              <EscudoBox>
                {rival.escudo ? (
                  <img src={rival.escudo} alt={rival.nombre} />
                ) : (
                  <MdShield size={48} color={theme.colors.textMuted} />
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
        width={FORM_MODAL_WIDTH}
        footer={
          <Row $gap={8}>
            <Button $variant="secondary" onClick={closeModal} disabled={saving}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button $variant="primary" onClick={handleSave} disabled={saving || !canMutate}>
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
          </Field>

          <Field>
            <Label>{t('rivals.escudo', 'Escudo')}</Label>
            <EscudoPreview>
              {escudo ? (
                <img src={escudo} alt="escudo" />
              ) : (
                <MdImage size={48} color={theme.colors.textMuted} />
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
        {cropperSrc && (
          <ImageCropper
            src={cropperSrc}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
            title={t('team.adjustImage', 'Ajustar imagen')}
          />
        )}
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
{viewing && canMutate && (
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
                <MdShield size={120} color={theme.colors.textMuted} />
              )}
            </DetailEscudo>

            <LinkedSection>
              <LinkedSectionTitle>
                <MdDescription size={16} />
                {t('rivals.matchSheets', 'Fichas de partido')} ({rivalMatchSheets.length})
              </LinkedSectionTitle>
              {rivalMatchSheets.length === 0 ? (
                <EmptyLinked>{t('rivals.noMatchSheets', 'Sin fichas de partido')}</EmptyLinked>
              ) : (
                <Stack $gap={6}>
                  {rivalMatchSheets.slice(0, 8).map((ms) => {
                    const date = ms.fechaHora ? new Date(ms.fechaHora).toLocaleDateString() : '';
                    const score = ms.golesFavor != null && ms.golesContra != null
                      ? `${ms.golesFavor} - ${ms.golesContra}`
                      : '';
                    return (
                      <LinkedItem key={ms._id} type="button" onClick={() => navigate(`/match-sheets?open=${ms._id}`)}>
                        <MdCalendarToday size={14} color={theme.colors.textMuted} />
                        <span>{date}{score ? ` — ${score}` : ''}</span>
                        <MdOpenInNew size={14} color={theme.colors.textMuted} />
                      </LinkedItem>
                    );
                  })}
                  {rivalMatchSheets.length > 8 && (
                    <EmptyLinked>+ {rivalMatchSheets.length - 8} más</EmptyLinked>
                  )}
                </Stack>
              )}
            </LinkedSection>

            <LinkedSection>
              <LinkedSectionTitle>
                <MdAnalytics size={16} />
                {t('rivals.analyses', 'Análisis')} ({rivalAnalysesMemos.length})
              </LinkedSectionTitle>
              {rivalAnalysesMemos.length === 0 ? (
                <EmptyLinked>{t('rivals.noAnalyses', 'Sin análisis de rival')}</EmptyLinked>
              ) : (
                <Stack $gap={6}>
                  {rivalAnalysesMemos.slice(0, 8).map((ra) => {
                    const date = ra.fecha ? new Date(ra.fecha).toLocaleDateString() : '';
                    const label = ra.rival || date || t('rivals.analysisNoName', 'Análisis');
                    return (
                      <LinkedItem key={ra._id} type="button" onClick={() => navigate(`/rival-analysis?open=${ra._id}`)}>
                        <MdAnalytics size={14} color={theme.colors.primary} />
                        <span>{label}</span>
                        <LinkedBadge $color={theme.colors.warning}>
                          {ra.alineacion || '—'}
                        </LinkedBadge>
                        <MdOpenInNew size={14} color={theme.colors.textMuted} />
                      </LinkedItem>
                    );
                  })}
                  {rivalAnalysesMemos.length > 8 && (
                    <EmptyLinked>+ {rivalAnalysesMemos.length - 8} más</EmptyLinked>
                  )}
                </Stack>
              )}
            </LinkedSection>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
