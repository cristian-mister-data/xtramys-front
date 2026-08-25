import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AuthFormShell,
  ErrorMessage,
  FormSubtitle,
  FormTitle,
  PrimaryButton,
  SecondaryLink,
  normalizeEmail,
} from './AuthFormLayout';

export default function AcceptClubInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = normalizeEmail(params.get('email'));
  const token = params.get('token') || '';
  const error = !email || !token ? 'El enlace de invitacion no es valido o esta incompleto.' : null;

  const acceptInvite = () => {
    if (!email || !token) return;
    navigate(`/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`, { replace: true });
  };

  return (
    <AuthFormShell maxWidth="480px" showBrandName={false}>
      <FormTitle $center>Aceptar invitacion del club</FormTitle>
      <FormSubtitle $center>
        Al aceptar, tu cuenta pasara a estar asociada al club y se cancelara tu plan Pro individual si estaba activo.
      </FormSubtitle>

      {error && <ErrorMessage $center>{error}</ErrorMessage>}

      <PrimaryButton type="button" disabled={!email || !token} onClick={acceptInvite}>
        Aceptar invitacion
      </PrimaryButton>

      <SecondaryLink to="/auth/login">Volver a iniciar sesion</SecondaryLink>
    </AuthFormShell>
  );
}
