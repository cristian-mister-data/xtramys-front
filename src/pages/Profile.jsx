import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { MdPlayCircleOutline } from 'react-icons/md';
import { Button, Field, Input, Label, Row, Stack, Muted } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import Modal from '@/ui/Modal';
import {
  changePassword,
  requestEmailChange,
  confirmEmailChange,
  resendEmailChangeCode,
  cancelEmailChange,
} from '@/api/auth';
import { updateUsuario, logoutThunk } from '@/store/slices/user/userThunks';
import { setUser } from '@/store/slices/user/userSlice';
import { checkSubscription } from '@/store/slices/user/userThunks';
import { createPortalSession, createCheckoutSession, reactivateSubscription, cancelSubscription } from '@/api/subscription';
import api from '@/api/client';
import ImageCropper from '@/components/season/ImageCropper';
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

const PendingBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.warningSoft || '#fff7ed'};
  border: 1px solid ${({ theme }) => theme.colors.warning || '#f59e0b'};
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  line-height: 1.4;
  flex-wrap: wrap;
`;

const CodeInput = styled(Input)`
  font-size: 22px;
  letter-spacing: 6px;
  text-align: center;
  font-weight: 600;
`;

const SubscriptionCard = styled.div`
  background: ${({ $plan, $cancelled, theme }) => {
    if ($cancelled) return 'linear-gradient(135deg, #92400E, #B45309)';
    if ($plan === 'pro') return 'linear-gradient(135deg, #1E40AF, #3B82F6)';
    return theme.colors.surface;
  }};
  border: ${({ $plan, theme }) =>
    $plan === 'pro' ? 'none' : `1px solid ${theme.colors.border}`};
  border-radius: 16px;
  padding: 24px;
  margin-top: 16px;
  overflow: hidden;
  position: relative;
`;

const SubHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const SubBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ $status }) => {
    if ($status === 'active') return 'rgba(16,185,129,0.2)';
    if ($status === 'cancelled') return 'rgba(245,158,11,0.2)';
    return 'rgba(239,68,68,0.15)';
  }};
  color: ${({ $status }) => {
    if ($status === 'active') return '#10B981';
    if ($status === 'cancelled') return '#F59E0B';
    return '#EF4444';
  }};
`;

const SubIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $plan }) => $plan === 'pro' ? 'rgba(255,255,255,0.15)' : 'rgba(107,114,128,0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const SubPlanName = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ $plan }) => $plan === 'pro' ? '#fff' : 'inherit'};
  margin-bottom: 4px;
`;

const SubInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: ${({ $type }) => {
    if ($type === 'renew') return 'rgba(16,185,129,0.12)';
    if ($type === 'cancelled') return 'rgba(245,158,11,0.12)';
    return 'rgba(255,255,255,0.08)';
  }};
  border: ${({ $type }) => {
    if ($type === 'renew') return '1px solid rgba(16,185,129,0.25)';
    if ($type === 'cancelled') return '1px solid rgba(245,158,11,0.25)';
    return '1px solid rgba(255,255,255,0.12)';
  }};
  margin-top: 12px;
`;

const SubInfoIcon = styled.span`
  font-size: 18px;
`;

const SubInfoText = styled.div`
  flex: 1;
  font-size: 14px;
  color: ${({ $plan }) => $plan === 'pro' ? 'rgba(255,255,255,0.9)' : 'inherit'};
  line-height: 1.4;
`;

const SubInfoDate = styled.strong`
  color: ${({ $plan }) => $plan === 'pro' ? '#fff' : 'inherit'};
`;

const SubActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
`;

const SubBtn = styled.button`
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.6 : 1};
  transition: all 150ms ease;
  border: ${({ $variant }) => $variant === 'primary' ? 'none' : '1px solid rgba(255,255,255,0.25)'};
  background: ${({ $variant }) => {
    if ($variant === 'primary') return '#10B981';
    if ($variant === 'secondary') return 'rgba(255,255,255,0.15)';
    return 'rgba(255,255,255,0.1)';
  }};
  color: #fff;
  &:hover {
    background: ${({ $variant }) => {
      if ($variant === 'primary') return '#059669';
      if ($variant === 'secondary') return 'rgba(255,255,255,0.25)';
      return 'rgba(255,255,255,0.15)';
    }};
  }
`;

const FreeCard = styled.div`
  text-align: center;
`;

const FreeIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #F3F4F6, #E5E7EB);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto 16px;
`;

const FreeTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 6px;
`;

const FreeDesc = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.muted || '#6B7280'};
  margin-bottom: 20px;
`;

const FreeBtn = styled.button`
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.6 : 1};
  transition: all 150ms ease;
  border: none;
  background: linear-gradient(135deg, #FF6B00, #E55A00);
  color: #fff;
  box-shadow: 0 4px 14px rgba(255,107,0,0.35);
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(255,107,0,0.4);
  }
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
  const [cropperSrc, setCropperSrc] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [language, setLanguage] = useState('es');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Verificación de cambio de email (similar al registro inicial).
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellingModal, setCancellingModal] = useState(false);
  // Mientras hay cambio pendiente, el correo actual sigue activo y
  // únicamente al confirmar el código se sustituye el correo principal.
  const [emailVerifyOpen, setEmailVerifyOpen] = useState(false);
  const [emailVerifyTarget, setEmailVerifyTarget] = useState('');
  const [emailVerifyCode, setEmailVerifyCode] = useState('');
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailResending, setEmailResending] = useState(false);
  const [emailVerifyError, setEmailVerifyError] = useState('');

  useEffect(() => {
    if (!user) return;
    setNombre(user.nombre || '');
    setApellido(user.apellido || '');
    setCorreo(user.correo || '');
    setLanguage(user.idioma || 'es');
  }, [user]);

  useEffect(() => {
    // Si el usuario refresca la página y aún tiene un cambio de email
    // pendiente, ofrecemos abrir directamente el modal de verificación.
    if (!emailVerifyOpen && user?.pendingEmail) {
      setEmailVerifyTarget(user.pendingEmail);
    }
  }, [user?.pendingEmail, emailVerifyOpen]);

  useEffect(() => {
    // Cargar estado de suscripción siempre para tener datos frescos
    dispatch(checkSubscription());
  }, [dispatch]);

  if (!user) {
    return <Muted>{t('message.loading', 'Cargando...')}</Muted>;
  }

  const isAdmin = user.role === 'admin';

  const handleSave = async () => {
    const normalizedNew = String(correo || '').trim().toLowerCase();
    const normalizedOld = String(user.correo || '').trim().toLowerCase();
    const emailChanged = normalizedNew && normalizedNew !== normalizedOld;

    setSaving(true);
    try {
      // 1) Guardamos primero el resto de datos sin tocar el correo. El correo
      //    requiere verificación independiente y no debe cambiarse aquí.
      const result = await dispatch(
        updateUsuario({ id: user._id, updatedUser: { nombre, apellido, idioma: language } }),
      ).unwrap();
      if (result?.idioma) i18n.changeLanguage(result.idioma);

      // 2) Si además el usuario cambió el correo, iniciamos el flujo de
      //    verificación enviando un código al nuevo email. Hasta que se
      //    confirme, el correo actual sigue siendo el activo.
      if (emailChanged) {
        try {
          await requestEmailChange({ userId: user._id, nuevoCorreo: normalizedNew });
          setEmailVerifyTarget(normalizedNew);
          setEmailVerifyCode('');
          setEmailVerifyError('');
          setEmailVerifyOpen(true);
          // Reflejamos pendingEmail en el store para que el badge aparezca
          // al instante sin esperar a un fetch.
          dispatch(setUser({ ...user, ...result, pendingEmail: normalizedNew }));
          toast.success(t('profile.emailChangeTitle', 'Verificar nuevo correo'));
        } catch (err) {
          const msg = err?.response?.data?.message || err?.message;
          toast.error(msg || t('profile.emailChangeRequestError', 'No se pudo enviar el código al nuevo correo'));
          // Restauramos el correo a su valor real porque el cambio no
          // se ha podido iniciar.
          setCorreo(user.correo || '');
        }
      } else {
        toast.success(t('message.userUpdated', 'Datos actualizados'));
      }

      setEditing(false);
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

  const handleConfirmEmailCode = async () => {
    const code = String(emailVerifyCode || '').trim();
    if (!/^\d{6}$/.test(code)) {
      setEmailVerifyError(t('profile.emailChangeCodeRequired', 'Introduce el código de verificación'));
      return;
    }
    setEmailVerifying(true);
    setEmailVerifyError('');
    try {
      const res = await confirmEmailChange({ userId: user._id, codigo: code });
      const updated = res?.user || { ...user, correo: emailVerifyTarget, pendingEmail: null };
      dispatch(setUser({ ...user, ...updated, pendingEmail: null }));
      setCorreo(updated.correo || emailVerifyTarget);
      setEmailVerifyOpen(false);
      setEmailVerifyCode('');
      setEmailVerifyTarget('');
      toast.success(t('profile.emailChangeSuccess', 'Correo actualizado correctamente'));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      setEmailVerifyError(msg || t('profile.emailChangeInvalidCode', 'Código incorrecto'));
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleResendEmailCode = async () => {
    setEmailResending(true);
    setEmailVerifyError('');
    try {
      await resendEmailChangeCode({ userId: user._id });
      toast.success(t('profile.emailChangeResent', 'Se ha enviado un nuevo código'));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      toast.error(msg || t('profile.emailChangeResendError', 'No se pudo reenviar el código'));
    } finally {
      setEmailResending(false);
    }
  };

  const handleCancelEmailChange = async () => {
    const ok = await confirmAction(t('profile.emailChangeCancel', '¿Cancelar el cambio de correo?'));
    if (!ok) return;
    try {
      await cancelEmailChange({ userId: user._id });
      dispatch(setUser({ ...user, pendingEmail: null }));
      setEmailVerifyOpen(false);
      setEmailVerifyCode('');
      setEmailVerifyTarget('');
      setCorreo(user.correo || '');
      toast.success(t('profile.emailChangeCancelled', 'Cambio de correo cancelado'));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      toast.error(msg || t('message.userUpdateError', 'No se pudo cancelar'));
    }
  };

  const handlePickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('message.invalidImage', 'El archivo no es una imagen válida'));
      return;
    }
    setCropperSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = async (dataUrl) => {
    setCropperSrc(null);
    setUploading(true);
    try {
      const [header, b64] = dataUrl.split(',');
      const mimeType = (header.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
      const base64 = b64 || dataUrl;
      const res = await api.post(`/user/${user._id}/image`, {
        imagen: base64,
        mimeType,
      });
      const updated = { ...user, imagen: res.data?.imagen || dataUrl };
      dispatch(setUser(updated));
      toast.success(t('message.imageUploaded', 'Imagen actualizada'));
    } catch {
      toast.error(t('message.imageUploadError', 'Error al subir la imagen'));
    } finally {
      setUploading(false);
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

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const data = await createPortalSession();
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err?.response?.data?.mensaje || 'Error al abrir gestión de suscripción');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const data = await cancelSubscription(user.paymentProvider);
      await dispatch(checkSubscription()).unwrap();
      toast.success(data.mensaje || 'SuscripciÃ³n cancelada. TendrÃ¡s acceso hasta el final del perÃ­odo actual.');
      setCancellingModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.mensaje || 'Error al cancelar la suscripciÃ³n');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubscribe = async () => {
    setPortalLoading(true);
    try {
      const baseUrl = window.location.origin;
      const data = await createCheckoutSession(baseUrl);
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err?.response?.data?.mensaje || 'Error al iniciar suscripción');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setPortalLoading(true);
    try {
      const data = await reactivateSubscription();
      if (data) {
        dispatch(setUser({ ...user, subscriptionCancelAtPeriodEnd: false, subscriptionStatus: data.subscriptionStatus }));
        toast.success(data.mensaje || 'Suscripción reactivada correctamente');
      }
    } catch (err) {
      if (err?.code === 'PAYPAL_REACTIVATE_REQUIRES_APPROVAL') {
        navigate('/subscribe');
        return;
      }
      toast.error(err?.response?.data?.mensaje || 'Error al reactivar suscripción');
    } finally {
      setPortalLoading(false);
    }
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
            {user.pendingEmail ? (
              <PendingBadge>
                <span>⏳</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {t('profile.emailChangePendingBadge', 'Pendiente de verificación: {{email}}', { email: user.pendingEmail })}
                </div>
                <Button
                  $variant="ghost"
                  type="button"
                  onClick={() => {
                    setEmailVerifyTarget(user.pendingEmail);
                    setEmailVerifyCode('');
                    setEmailVerifyError('');
                    setEmailVerifyOpen(true);
                  }}
                >
                  {t('profile.emailChangeTitle', 'Verificar')}
                </Button>
                <Button
                  $variant="ghost"
                  type="button"
                  onClick={handleCancelEmailChange}
                  style={{ color: '#ef4444' }}
                >
                  {t('edition.cancel', 'Cancelar')}
                </Button>
              </PendingBadge>
            ) : null}
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
          <CardTitle>💳 {t('subscription.title', 'Suscripción')}</CardTitle>
        </CardHeader>
        <SubscriptionCard $plan={user.plan} $cancelled={user.subscriptionCancelAtPeriodEnd}>
          {user.plan === 'pro' && user.subscriptionStatus === 'active' ? (
            <>
              <SubHeader>
                <div>
                  <SubBadge $status={user.subscriptionCancelAtPeriodEnd ? 'cancelled' : 'active'}>
                    {user.subscriptionCancelAtPeriodEnd ? '⚠️ Cancelada' : '✓ Activa'}
                  </SubBadge>
                </div>
                <SubIcon $plan={user.plan}>👑</SubIcon>
              </SubHeader>
              
              <SubPlanName $plan={user.plan}>{t('subscription.plan', 'Plan Profesional')}</SubPlanName>
              
              {user.subscriptionCurrentPeriodEnd && (
                <SubInfoRow $type={user.subscriptionCancelAtPeriodEnd ? 'cancelled' : 'renew'}>
                  <SubInfoIcon>
                    {user.subscriptionCancelAtPeriodEnd ? '⏰' : '🔄'}
                  </SubInfoIcon>
                  <SubInfoText $plan={user.plan}>
                    {user.subscriptionCancelAtPeriodEnd 
                      ? t('subscription.accessUntil', 'Acceso hasta')
                      : t('subscription.renewsOn', 'Se renueva el')}: {' '}
                    <SubInfoDate $plan={user.plan}>
                      {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </SubInfoDate>
                  </SubInfoText>
                </SubInfoRow>
              )}

              {!user.subscriptionCancelAtPeriodEnd && (
                <SubInfoRow $type="info">
                  <SubInfoIcon>✅</SubInfoIcon>
                  <SubInfoText $plan={user.plan}>
                    {t('subscription.autoRenew', 'Renovación automática activada')}
                  </SubInfoText>
                </SubInfoRow>
              )}
              
              <SubActions>
                {user.paymentProvider === 'stripe' && (
                <SubBtn 
                  type="button" 
                  $variant="secondary"
                  onClick={handleManageSubscription} 
                  disabled={portalLoading}
                >
                  {portalLoading ? '⏳...' : '⚙️ ' + t('subscription.manage', 'Gestionar')}
                </SubBtn>
                )}
                {!user.subscriptionCancelAtPeriodEnd && (
                  <SubBtn
                    type="button"
                    $variant="danger"
                    onClick={() => setCancellingModal(true)}
                    disabled={portalLoading}
                    style={{ background: '#ef4444', border: 'none' }}
                  >
                    {t('subscription.cancel', 'Cancelar suscripciÃ³n')}
                  </SubBtn>
                )}
                {user.subscriptionCancelAtPeriodEnd && (
                  <SubBtn 
                    type="button" 
                    $variant="primary"
                    onClick={handleReactivateSubscription} 
                    disabled={portalLoading}
                  >
                    {portalLoading ? '⏳...' : '🔄 ' + t('subscription.reactivate', 'Reactivar')}
                  </SubBtn>
                )}
              </SubActions>
            </>
          ) : (
            <FreeCard>
              <FreeIcon>🆓</FreeIcon>
              <FreeTitle>{t('subscription.freePlan', 'Plan Gratuito')}</FreeTitle>
              <FreeDesc>
                {t('subscription.freeDescription', 'Accede a todas las funciones con una suscripción profesional.')}
              </FreeDesc>
              <FreeBtn 
                type="button" 
                onClick={handleSubscribe} 
                disabled={portalLoading}
              >
                {portalLoading ? '⏳...' : '🚀 ' + t('subscription.subscribe', 'Suscribirme ahora')}
              </FreeBtn>
            </FreeCard>
          )}
        </SubscriptionCard>
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

      <Modal
        open={cancellingModal}
        onClose={() => { if (!cancelling) setCancellingModal(false); }}
        title={t('subscription.cancelTitle', 'Cancelar suscripciÃ³n')}
        footer={
          <>
            <Button
              type="button"
              $variant="ghost"
              onClick={() => setCancellingModal(false)}
              disabled={cancelling}
            >
              {t('edition.cancel', 'Cancelar')}
            </Button>
            <Button
              type="button"
              onClick={handleCancelSubscription}
              disabled={cancelling}
              style={{ background: '#ef4444', borderColor: '#ef4444' }}
            >
              {cancelling ? t('common.saving', 'Cancelando...') : t('subscription.confirmCancel', 'SÃ­, cancelar')}
            </Button>
          </>
        }
      >
        <Stack style={{ gap: 14 }}>
          <Muted>
            {t('subscription.cancelMessage', 'Â¿EstÃ¡s seguro de que quieres cancelar tu suscripciÃ³n? SeguirÃ¡s teniendo acceso hasta el final del perÃ­odo actual.')}
          </Muted>
          {user.subscriptionCurrentPeriodEnd && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13 }}>
              {t('subscription.accessUntil', 'Acceso hasta')}: <strong>{new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </div>
          )}
        </Stack>
      </Modal>

      <Modal
        open={emailVerifyOpen}
        onClose={() => {
          if (emailVerifying) return;
          setEmailVerifyOpen(false);
        }}
        title={t('profile.emailChangeTitle', 'Verificar nuevo correo')}
        footer={
          <>
            <Button
              type="button"
              $variant="ghost"
              onClick={() => setEmailVerifyOpen(false)}
              disabled={emailVerifying}
            >
              {t('edition.cancel', 'Cancelar')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEmailCode}
              disabled={emailVerifying || !emailVerifyCode}
            >
              {emailVerifying
                ? t('common.saving', 'Verificando...')
                : t('verify.verify', 'Verificar')}
            </Button>
          </>
        }
      >
        <Stack style={{ gap: 14 }}>
          <Muted>
            {t('profile.emailChangeSubtitle', 'Hemos enviado un código de 6 dígitos a {{email}}. Hasta que lo verifiques, tu correo actual seguirá activo.', {
              email: emailVerifyTarget || user.pendingEmail || '',
            })}
          </Muted>
          <Field>
            <Label>{t('verify.title', 'Código de verificación')}</Label>
            <CodeInput
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={emailVerifyCode}
              onChange={(e) => {
                setEmailVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (emailVerifyError) setEmailVerifyError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmEmailCode();
              }}
              autoFocus
            />
          </Field>
          {emailVerifyError ? (
            <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              {emailVerifyError}
            </div>
          ) : null}
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Button
              type="button"
              $variant="ghost"
              onClick={handleResendEmailCode}
              disabled={emailResending || emailVerifying}
            >
              {emailResending
                ? t('common.saving', 'Enviando...')
                : t('verify.resend', 'Reenviar código')}
            </Button>
            <Button
              type="button"
              $variant="ghost"
              onClick={handleCancelEmailChange}
              disabled={emailVerifying}
              style={{ color: '#ef4444' }}
            >
              {t('profile.emailChangeCancel', 'Cancelar cambio de correo')}
            </Button>
          </Row>
        </Stack>
      </Modal>

      {cropperSrc ? (
        <ImageCropper
          src={cropperSrc}
          title={t('profile.adjustPhoto', 'Ajustar foto')}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropperSrc(null)}
        />
      ) : null}
    </Stack>
  );
}
