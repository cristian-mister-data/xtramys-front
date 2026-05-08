import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { MdPlayCircleOutline } from 'react-icons/md';
import { Button, Field, Input, Label, Row, Stack, Muted } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import { changePassword } from '@/api/auth';
import { updateUsuario, logoutThunk } from '@/store/slices/user/userThunks';
import { setUser } from '@/store/slices/user/userSlice';
import api from '@/api/client';
import { fileToBase64 } from '@/components/player/playerHelpers';
import { useTutorial } from '@/components/shared/TutorialProvider';
import flagEs from '@/images/spain.png';
import flagEn from '@/images/united-kingdom.png';

const Hero = styled.div`
  background: linear-gradient(135deg, #1e3a5f, #2563eb 60%, #3b82f6);
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 32px 24px;
  color: #fff;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const AvatarWrap = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 12px;
`;

const Avatar = styled.label`
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #fff;
  border: 4px solid rgba(255, 255, 255, 0.35);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: #94a3b8;
  img { width: 100%; height: 100%; object-fit: cover; }
  input { display: none; }
`;

const CameraBadge = styled.span`
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #3578e5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 3px solid #fff;
  pointer-events: none;
`;

const HeroName = styled.div`
  font-size: 22px;
  font-weight: 700;
  margin-top: 4px;
`;

const HeroEmail = styled.div`
  font-size: 13px;
  opacity: 0.85;
  margin-top: 2px;
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
`;

const FormCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 18px;
  margin-top: 16px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text};
`;

const LangRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const LangBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ $active, theme }) => ($active ? theme.colors.success : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.successSoft : theme.colors.surfaceAlt)};
  color: ${({ theme }) => theme.colors.text};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled, $active }) => ($disabled && !$active ? 0.6 : 1)};
  text-align: left;
  font-size: 14px;
  transition: background 150ms ease, border-color 150ms ease;
  &:hover {
    background: ${({ $disabled, $active, theme }) => ($disabled ? ( $active ? theme.colors.successSoft : theme.colors.surfaceAlt ) : ($active ? theme.colors.successSoft : theme.colors.surfaceElevated))};
  }
`;

const Flag = styled.span`
  width: 32px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FlagImage = styled.img`
  width: 32px;
  height: 22px;
  object-fit: contain;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const AccountBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  &:hover { background: ${({ theme }) => theme.colors.surfaceAlt}; }
`;

const DangerBtn = styled(AccountBtn)`
  color: #ef4444;
  &:hover { background: #fef2f2; }
`;

export default function Profile() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { openTutorial } = useTutorial();
  const user = useSelector((s) => s.usuario?.user);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [language, setLanguage] = useState('es');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!user) return;
    setNombre(user.nombre || '');
    setApellido(user.apellido || '');
    setCorreo(user.correo || '');
    setLanguage(user.idioma || 'es');
  }, [user]);

  if (!user) {
    return <Muted>{t('message.loading', 'Cargando...')}</Muted>;
  }

  const isAdmin = user.role === 'admin';

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await dispatch(
        updateUsuario({ id: user._id, updatedUser: { nombre, apellido, correo, idioma: language } }),
      ).unwrap();
      if (result?.idioma) i18n.changeLanguage(result.idioma);
      setEditing(false);
      toast.success(t('message.userUpdated', 'Datos actualizados'));
    } catch {
      toast.error(t('message.userUpdateError', 'No se pudo actualizar'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNombre(user.nombre || '');
    setApellido(user.apellido || '');
    setCorreo(user.correo || '');
    setLanguage(user.idioma || 'es');
    setEditing(false);
  };

  const handlePickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('message.invalidImage', 'El archivo no es una imagen válida'));
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToBase64(file);
      // strip data URL prefix to send raw base64
      const base64 = String(dataUrl).split(',')[1] || dataUrl;
      const res = await api.post(`/user/${user._id}/image`, {
        imagen: base64,
        mimeType: file.type || 'image/jpeg',
      });
      const updated = { ...user, imagen: res.data?.imagen || dataUrl };
      dispatch(setUser(updated));
      toast.success(t('message.imageUploaded', 'Imagen actualizada'));
    } catch {
      toast.error(t('message.imageUploadError', 'Error al subir la imagen'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    const ok = await confirmAction(t('message.deleteImageConfirm', '¿Quieres eliminar tu foto?'));
    if (!ok) return;
    setUploading(true);
    try {
      await api.delete(`/user/${user._id}/image`);
      dispatch(setUser({ ...user, imagen: null }));
      toast.success(t('message.imageDeleted', 'Imagen eliminada'));
    } catch {
      toast.error(t('message.imageDeleteError', 'No se pudo eliminar la imagen'));
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirmAction(t('profile.logoutConfirm', '¿Cerrar sesión?'));
    if (!ok) return;
    await dispatch(logoutThunk());
    navigate('/auth/login');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('profile.passwordFieldsRequired', 'Rellena todos los campos de contraseña'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('reset.minLength', 'La contraseña debe tener al menos 8 caracteres'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordsDoNotMatch', 'Las contraseñas no coinciden'));
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({
        userId: user._id,
        contraseñaActual: currentPassword,
        nuevaContraseña: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('profile.passwordUpdated', 'Contraseña actualizada correctamente'));
    } catch (error) {
      toast.error(error.message || t('profile.passwordUpdateError', 'No se pudo actualizar la contraseña'));
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = `${(user.nombre || '?').charAt(0)}${(user.apellido || '').charAt(0)}`.toUpperCase();

  return (
    <Stack style={{ gap: 0 }}>
      <Hero>
        <AvatarWrap>
          <Avatar>
            {uploading
              ? <span style={{ fontSize: 14, color: '#3578e5' }}>...</span>
              : user.imagen
                ? <img src={user.imagen} alt="" />
                : initials}
            <input type="file" accept="image/*" onChange={handlePickPhoto} disabled={uploading} />
          </Avatar>
          <CameraBadge>📷</CameraBadge>
        </AvatarWrap>
        {user.imagen ? (
          <Button $variant="ghost" type="button" onClick={handleDeletePhoto} disabled={uploading}
            style={{ background: 'rgba(239,68,68,0.18)', color: '#fff', border: 'none' }}>
            🗑 {t('common.delete', 'Eliminar foto')}
          </Button>
        ) : null}
        <HeroName>{user.nombre} {user.apellido}</HeroName>
        <HeroEmail>{user.correo}</HeroEmail>
        {isAdmin ? <div><RoleBadge>🛡 Admin</RoleBadge></div> : null}
      </Hero>

      <FormCard>
        <CardHeader>
          <CardTitle>👤 {t('profile.personalInfo', 'Información personal')}</CardTitle>
          {!editing ? (
            <Button $variant="ghost" type="button" onClick={() => setEditing(true)}>
              ✏️ {t('edition.edit', 'Editar')}
            </Button>
          ) : null}
        </CardHeader>
        <Stack style={{ gap: 12 }}>
          <Field>
            <Label>🪪 {t('register.firstName', 'Nombre')}</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!editing} />
          </Field>
          <Field>
            <Label>🪪 {t('register.lastName', 'Apellido')}</Label>
            <Input value={apellido} onChange={(e) => setApellido(e.target.value)} disabled={!editing} />
          </Field>
          <Field>
            <Label>✉️ {t('register.email', 'Correo electrónico')}</Label>
            <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} disabled={!editing} />
          </Field>
        </Stack>
      </FormCard>

      <FormCard>
        <CardHeader>
          <CardTitle>🌐 {t('profile.language', 'Idioma')}</CardTitle>
        </CardHeader>
        <LangRow>
          <LangBtn
            type="button"
            $active={language === 'es'}
            $disabled={!editing}
            disabled={!editing}
            onClick={() => { setLanguage('es'); i18n.changeLanguage('es'); }}
          >
            <Flag>
              <FlagImage src={flagEs} alt="Español" />
            </Flag>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Español</div>
              <Muted style={{ fontSize: 12 }}>Spanish</Muted>
            </div>
            {language === 'es' ? <span style={{ color: '#10b981' }}>✓</span> : null}
          </LangBtn>
          <LangBtn
            type="button"
            $active={language === 'en'}
            $disabled={!editing}
            disabled={!editing}
            onClick={() => { setLanguage('en'); i18n.changeLanguage('en'); }}
          >
            <Flag>
              <FlagImage src={flagEn} alt="English" />
            </Flag>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>English</div>
              <Muted style={{ fontSize: 12 }}>Inglés</Muted>
            </div>
            {language === 'en' ? <span style={{ color: '#10b981' }}>✓</span> : null}
          </LangBtn>
        </LangRow>
      </FormCard>

      {editing ? (
        <ActionRow>
          <Button type="button" $variant="ghost" onClick={handleCancel} disabled={saving}>
            {t('edition.cancel', 'Cancelar')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving', 'Guardando...') : `✓ ${t('edition.saveChanges', 'Guardar cambios')}`}
          </Button>
        </ActionRow>
      ) : null}

      <FormCard>
        <CardHeader>
          <CardTitle>🔒 {t('profile.changePassword', 'Cambiar contraseña')}</CardTitle>
        </CardHeader>
        <Stack style={{ gap: 12 }}>
          <Field>
            <Label>{t('profile.currentPassword', 'Contraseña actual')}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field>
            <Label>{t('reset.newPassword', 'Nueva contraseña')}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field>
            <Label>{t('profile.confirmNewPassword', 'Confirmar nueva contraseña')}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </Stack>
        <ActionRow>
          <Button type="button" onClick={handleChangePassword} disabled={changingPassword}>
            {changingPassword ? t('common.saving', 'Guardando...') : t('profile.updatePassword', 'Actualizar contraseña')}
          </Button>
        </ActionRow>
      </FormCard>

      <FormCard>
        <CardHeader>
          <CardTitle>⚙️ {t('profile.account', 'Cuenta')}</CardTitle>
        </CardHeader>
        <Row style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <AccountBtn type="button" onClick={openTutorial}>
            <MdPlayCircleOutline size={20} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div>{t('tutorial.replayButton', 'Ver tutorial de nuevo')}</div>
              <Muted style={{ fontSize: 12, color: '#94a3b8' }}>
                {t('tutorial.replayHint', 'Puedes volver a ver este tutorial desde tu perfil.')}
              </Muted>
            </div>
            <span style={{ color: '#cbd5e1' }}>›</span>
          </AccountBtn>
          <DangerBtn type="button" onClick={handleLogout}>
            <span>🚪</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div>{t('profile.logout', 'Cerrar sesión')}</div>
              <Muted style={{ fontSize: 12, color: '#94a3b8' }}>
                {t('profile.logoutConfirm', '¿Cerrar sesión en este dispositivo?')}
              </Muted>
            </div>
            <span style={{ color: '#cbd5e1' }}>›</span>
          </DangerBtn>
        </Row>
      </FormCard>
    </Stack>
  );
}
