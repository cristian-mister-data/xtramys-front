import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { MdPlayCircleOutline, MdLightMode, MdDarkMode } from 'react-icons/md';
import { useThemeMode } from '@/theme/ThemeContext.jsx';
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
import { hasPaidSubscriptionAccess } from '@/utils/subscriptionAccess';
import ImageCropper from '@/components/season/ImageCropper';
import { useTutorial } from '@/components/shared/TutorialProvider';
import flagEs from '@/images/spain.png';
import flagEn from '@/images/united-kingdom.png';

const Hero = styled.div`
  background: ${({ theme }) => theme.mode === 'dark' ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'linear-gradient(135deg, #1e3a5f, #2563eb 60%, #3b82f6)'};
  border-radius: 24px;
  padding: 40px 24px;
  color: #fff;
  text-align: center;
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(37, 99, 235, 0.2)'};
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9InAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcCkiLz48L3N2Zz4=');
    pointer-events: none;
  }
`;

const AvatarWrap = styled.div`
  position: relative;
  width: 130px;
  height: 130px;
  margin: 0 auto 16px;
  z-index: 1;
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
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
  border-radius: 20px;
  padding: 24px;
  margin-top: 24px;
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)'};
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
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
  border-color: rgba(239, 68, 68, 0.3);
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'};
    border-color: #ef4444;
  }
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
    if ($plan === 'pro') {
      if ($cancelled) {
        return theme.mode === 'dark' 
          ? 'linear-gradient(135deg, rgba(146, 64, 14, 0.4), rgba(180, 83, 9, 0.2))' 
          : 'linear-gradient(135deg, #FFFBEB, #FEF3C7)';
      }
      return theme.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(30, 64, 175, 0.4), rgba(59, 130, 246, 0.2))'
        : 'linear-gradient(135deg, #EFF6FF, #DBEAFE)';
    }
    return theme.colors.surface;
  }};
  border: ${({ theme, $plan, $cancelled }) => {
    if ($plan === 'pro') {
      if ($cancelled) {
         return theme.mode === 'dark' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #FCD34D';
      }
      return theme.mode === 'dark' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #BFDBFE';
    }
    return `1px solid ${theme.colors.border}`;
  }};
  border-radius: 16px;
  padding: 24px;
  margin-top: 16px;
  overflow: hidden;
  position: relative;
  color: ${({ theme, $plan }) => $plan === 'pro' ? theme.colors.text : 'inherit'};
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
  background: ${({ $plan, theme }) => $plan === 'pro' ? (theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)') : 'rgba(107,114,128,0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const SubPlanName = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ $plan, theme }) => $plan === 'pro' ? (theme.mode === 'dark' ? '#60A5FA' : '#1D4ED8') : 'inherit'};
  margin-bottom: 4px;
`;

const SubInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: ${({ $type, theme }) => {
    if ($type === 'renew') return theme.mode === 'dark' ? 'rgba(16,185,129,0.12)' : '#ECFDF5';
    if ($type === 'cancelled') return theme.mode === 'dark' ? 'rgba(245,158,11,0.12)' : '#FFFBEB';
    return theme.colors.surfaceAlt;
  }};
  border: ${({ $type, theme }) => {
    if ($type === 'renew') return theme.mode === 'dark' ? '1px solid rgba(16,185,129,0.25)' : '1px solid #A7F3D0';
    if ($type === 'cancelled') return theme.mode === 'dark' ? '1px solid rgba(245,158,11,0.25)' : '1px solid #FDE68A';
    return `1px solid ${theme.colors.border}`;
  }};
  margin-top: 12px;
`;

const SubInfoIcon = styled.span`
  font-size: 18px;
`;

const SubInfoText = styled.div`
  flex: 1;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.4;
`;

const SubInfoDate = styled.strong`
  color: ${({ theme }) => theme.colors.text};
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
  border: ${({ $variant, theme }) => $variant === 'primary' || $variant === 'danger' ? 'none' : `1px solid ${theme.colors.border}`};
  background: ${({ $variant, theme }) => {
    if ($variant === 'primary') return '#10B981';
    if ($variant === 'danger') return '#EF4444';
    if ($variant === 'secondary') return theme.colors.surfaceAlt;
    return theme.colors.surface;
  }};
  color: ${({ $variant, theme }) => ($variant === 'primary' || $variant === 'danger' ? '#fff' : theme.colors.text)};
  &:hover {
    background: ${({ $variant, theme }) => {
      if ($variant === 'primary') return '#059669';
      if ($variant === 'danger') return '#DC2626';
      if ($variant === 'secondary') return theme.colors.surfaceElevated;
      return theme.colors.surfaceAlt;
    }};
  }
`;

const FreeCard = styled.div`
  text-align: center;
  padding: 32px 20px;
`;

const FreeIcon = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #F3F4F6, #E5E7EB)'};
  border: ${({ theme }) => theme.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  margin: 0 auto 20px;
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? 'none' : '0 10px 25px rgba(0,0,0,0.05)'};
`;

const FreeTitle = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`;

const FreeDesc = styled.div`
  font-size: 15px;
  color: ${({ theme }) => theme.colors.muted || '#6B7280'};
  margin-bottom: 28px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
`;

const FreeBtn = styled.button`
  padding: 14px 28px;
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

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 24px;
  align-items: start;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 16px 40px;

  @media (min-width: 960px) {
    grid-template-columns: 320px 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ReadOnlyGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  
  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const ReadOnlyItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
`;

const ReadOnlyLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ReadOnlyValue = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SocialBadge = styled.span`
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(29, 78, 216, 0.06)'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.25)' : 'rgba(29, 78, 216, 0.15)'};
  color: ${({ theme }) => theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'};
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

export default function Profile() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { openTutorial } = useTutorial();
  const user = useSelector((s) => s.usuario?.user);
  const { mode, toggleTheme } = useThemeMode();

  const [editing, setEditing] = useState(true);
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

  useEffect(() => {
    return () => {
      // Si desmontamos la pantalla y el idioma actual del i18n difiere del guardado en Redux, revertimos al guardado
      if (user?.idioma && i18n.language !== user.idioma) {
        i18n.changeLanguage(user.idioma);
      }
    };
  }, [user?.idioma, i18n]);

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
    if (user?.idioma) i18n.changeLanguage(user.idioma);
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
      toast.success(data.mensaje || t('subscription.cancelSuccess', 'Suscripción cancelada. Tendrás acceso hasta el final del período actual.'));
      setCancellingModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.mensaje || t('subscription.cancelError', 'Error al cancelar la suscripción'));
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
      const data = await reactivateSubscription(user.paymentProvider);
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

  const isSocialAuth = user?.authProvider !== 'local' && user?.authProvider !== undefined;
  const isGoogle = user?.authProvider === 'google';
  const isApple = user?.authProvider === 'apple';
  const hasProfileChanges =
    nombre !== (user.nombre || '') ||
    apellido !== (user.apellido || '') ||
    correo !== (user.correo || '') ||
    language !== (user.idioma || 'es');

  return (
    <ProfileGrid>
      <LeftColumn>
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
            <CardTitle>🎨 {t('profile.appearance', 'Apariencia')}</CardTitle>
          </CardHeader>
          <LangRow>
            <LangBtn
              type="button"
              $active={mode === 'light'}
              onClick={() => { if (mode !== 'light') toggleTheme(); }}
            >
              <Flag>
                <MdLightMode size={24} color="#f59e0b" />
              </Flag>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{t('common.lightMode', 'Modo claro')}</div>
              </div>
              {mode === 'light' ? <span style={{ color: '#10b981' }}>✓</span> : null}
            </LangBtn>
            <LangBtn
              type="button"
              $active={mode === 'dark'}
              onClick={() => { if (mode !== 'dark') toggleTheme(); }}
            >
              <Flag>
                <MdDarkMode size={24} color="#60a5fa" />
              </Flag>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{t('common.darkMode', 'Modo oscuro')}</div>
              </div>
              {mode === 'dark' ? <span style={{ color: '#10b981' }}>✓</span> : null}
            </LangBtn>
          </LangRow>
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
      </LeftColumn>

      <RightColumn>
        <FormCard>
          <CardHeader>
            <CardTitle>👤 {t('profile.personalInfo', 'Información personal')}</CardTitle>
            {hasProfileChanges ? (
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? t('common.saving', 'Guardando...') : `✓ ${t('edition.saveChanges', 'Guardar cambios')}`}
              </Button>
            ) : null}
          </CardHeader>
          
            <Stack style={{ gap: 16 }}>
              <Field>
                <Label>🪪 {t('register.firstName', 'Nombre')}</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </Field>
              <Field>
                <Label>🪪 {t('register.lastName', 'Apellido')}</Label>
                <Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
              </Field>
              <Field>
                <Label>✉️ {t('register.email', 'Correo electrónico')}</Label>
                {isSocialAuth ? (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Input type="email" value={correo} disabled style={{ opacity: 0.85, flex: 1, paddingRight: '180px' }} />
                    <div style={{ position: 'absolute', right: '12px', zIndex: 2 }}>
                      <SocialBadge>
                        🔒 {isGoogle ? t('profile.googleConnected', 'Conectado con Google') : t('profile.appleConnected', 'Conectado con Apple')}
                      </SocialBadge>
                    </div>
                  </div>
                ) : (
                  <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
                )}
                {!isSocialAuth && user.pendingEmail ? (
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
              <Field>
                <Label>🌐 {t('profile.language', 'Idioma')}</Label>
                <LangRow>
                  <LangBtn
                    type="button"
                    $active={language === 'es'}
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
              </Field>
            </Stack>
        </FormCard>

        <FormCard>
          <CardHeader>
            <CardTitle>💳 {t('subscription.titleProfile', 'Suscripción')}</CardTitle>
          </CardHeader>
          <SubscriptionCard $plan={hasPaidSubscriptionAccess(user) ? 'pro' : 'free'} $cancelled={user.subscriptionCancelAtPeriodEnd}>
            {hasPaidSubscriptionAccess(user) ? (
              (() => {
                const isCancelledActive =
                  user.subscriptionCancelAtPeriodEnd ||
                  (user.subscriptionStatus === 'canceled' || user.subscriptionStatus === 'cancelled');
                return (
                  <>
                    <SubHeader>
                      <div>
                        <SubBadge $status={isCancelledActive ? 'cancelled' : 'active'}>
                          {isCancelledActive
                            ? '⚠️ ' + t('subscription.cancelledBadge', 'Cancelada')
                            : '✓ ' + t('subscription.activeBadge', 'Activa')}
                        </SubBadge>
                      </div>
                      <SubIcon $plan="pro">👑</SubIcon>
                    </SubHeader>

                    <SubPlanName $plan="pro">{t('subscription.plan', 'Plan Profesional')}</SubPlanName>

                    {user.subscriptionCurrentPeriodEnd && (
                      <SubInfoRow $type={isCancelledActive ? 'cancelled' : 'renew'}>
                        <SubInfoIcon>
                          {isCancelledActive ? '⏰' : '🔄'}
                        </SubInfoIcon>
                        <SubInfoText $plan="pro">
                          {isCancelledActive
                            ? t('subscription.accessUntil', 'Acceso hasta')
                            : t('subscription.renewsOn', 'Se renueva el')}: {' '}
                          <SubInfoDate $plan="pro">
                            {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </SubInfoDate>
                        </SubInfoText>
                      </SubInfoRow>
                    )}

                    {!isCancelledActive && (
                      <SubInfoRow $type="info">
                        <SubInfoIcon>✅</SubInfoIcon>
                        <SubInfoText $plan="pro">
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
                      {!isCancelledActive && (
                        <SubBtn
                          type="button"
                          $variant="danger"
                          onClick={() => setCancellingModal(true)}
                          disabled={portalLoading}
                          style={{ background: '#ef4444', border: 'none' }}
                        >
                          {t('subscription.cancel', 'Cancelar suscripción')}
                        </SubBtn>
                      )}
                      {isCancelledActive && (
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
                );
              })()
            ) : (
              <FreeCard>
                <FreeIcon>💳</FreeIcon>
                <FreeTitle>{t('subscription.required', 'Suscripción necesaria')}</FreeTitle>
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

        {!isSocialAuth && (
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
        )}
      </RightColumn>

      <Modal
        open={cancellingModal}
        onClose={() => { if (!cancelling) setCancellingModal(false); }}
        title={t('subscription.cancelTitle', 'Cancelar suscripción')}
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
              {cancelling ? t('common.saving', 'Cancelando...') : t('subscription.confirmCancel', 'Sí, cancelar')}
            </Button>
          </>
        }
      >
        <Stack style={{ gap: 14 }}>
          <Muted>
            {t('subscription.cancelMessage', '¿Estás seguro de que quieres cancelar tu suscripción? Seguirás teniendo acceso hasta el final del período actual.')}
          </Muted>
          {user.subscriptionCurrentPeriodEnd && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13 }}>
              {t('subscription.accessUntil', 'Acceso hasta')}: <strong>{new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
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
    </ProfileGrid>
  );
}
