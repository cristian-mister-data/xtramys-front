import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RequireSeason from './RequireSeason';
import AuthLayout from '@/layouts/AuthLayout';
import AppLayout from '@/layouts/AppLayout';
import FullscreenLayout from '@/layouts/FullscreenLayout';
import LangSubscribe from '@/pages/LangSubscribe';
import DemoSubscribeGate from '@/components/demo/DemoSubscribeGate';

import Welcome from '@/pages/auth/Welcome';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import AcceptClubInvite from '@/pages/auth/AcceptClubInvite';
import NotFound from '@/pages/NotFound';

const Home = lazy(() => import('@/pages/Home'));
const Season = lazy(() => import('@/pages/Season'));
const CreateSeason = lazy(() => import('@/pages/CreateSeason'));
const Tournaments = lazy(() => import('@/pages/Tournaments'));
const Players = lazy(() => import('@/pages/Players'));
const PlayerProfile = lazy(() => import('@/pages/PlayerProfile'));
const Exercises = lazy(() => import('@/pages/Exercises'));
const Strategies = lazy(() => import('@/pages/Strategies'));
const SetPieces = lazy(() => import('@/pages/SetPieces'));
const Training = lazy(() => import('@/pages/Training'));
const MyVideos = lazy(() => import('@/pages/MyVideos'));
const Statistics = lazy(() => import('@/pages/Statistics'));
const Injuries = lazy(() => import('@/pages/Injuries'));
const InjuryStatistics = lazy(() => import('@/pages/InjuryStatistics'));
const InjuryPrevention = lazy(() => import('@/pages/InjuryPrevention'));
const MatchSheets = lazy(() => import('@/pages/MatchSheets'));
const RivalAnalysis = lazy(() => import('@/pages/RivalAnalysis'));
const Scouting = lazy(() => import('@/pages/Scouting'));
const Rivals = lazy(() => import('@/pages/Rivals'));
const Anthropometry = lazy(() => import('@/pages/Anthropometry'));
const Nutrition = lazy(() => import('@/pages/Nutrition'));
const Methodology = lazy(() => import('@/pages/Methodology'));
const GoalkeeperMethodology = lazy(() => import('@/pages/GoalkeeperMethodology'));
const WellnessTemplates = lazy(() => import('@/pages/WellnessTemplates'));
const WellnessManagement = lazy(() => import('@/pages/WellnessManagement'));
const Profile = lazy(() => import('@/pages/Profile'));
const Friends = lazy(() => import('@/pages/Friends'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const ClubDashboard = lazy(() => import('@/pages/club/Dashboard'));

const TacticalBoardPage = lazy(() => import('@/pages/TacticalBoard'));
const VideoEditor = lazy(() => import('@/pages/VideoEditor'));
const Subscribe = lazy(() => import('@/pages/Subscribe'));
const SubscribeClub = lazy(() => import('@/pages/SubscribeClub'));
const PaymentSuccess = lazy(() => import('@/pages/PaymentSuccess'));
const PayPalSuccess = lazy(() => import('@/pages/PayPalSuccess'));

const WellnessForm = lazy(() => import('@/pages/public/WellnessForm'));
const PreWellnessForm = lazy(() => import('@/pages/public/PreWellnessForm'));
const TrainingSessionShare = lazy(() => import('@/pages/public/TrainingSessionShare'));
const SetPieceShare = lazy(() => import('@/pages/public/SetPieceShare'));
const FriendshipAccept = lazy(() => import('@/pages/public/FriendshipAccept'));
const StrengthExercises = lazy(() => import('@/pages/StrengthExercises'));
const CoachSetup = lazy(() => import('@/pages/CoachSetup'));
const OpsDashboard = lazy(() => import('@/pages/OpsDashboard'));

const RouteFallback = () => (
  <div style={{ padding: 24, color: 'inherit', opacity: 0.6 }}>Cargando...</div>
);

const lazy_ = (el) => <Suspense fallback={<RouteFallback />}>{el}</Suspense>;

const SubscribeRoute = (
  <ProtectedRoute>
    {lazy_(<Subscribe />)}
  </ProtectedRoute>
);

const SubscribeClubRoute = (
  <ProtectedRoute>
    {lazy_(<SubscribeClub />)}
  </ProtectedRoute>
);

export default function AppRouter() {
  return (
    <Routes>
      {/* Root: redirect to login or app based on auth status */}
      <Route path="/" element={<Navigate to="/auth/login" replace />} />

      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/welcome" element={<Welcome />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/accept-club-invite" element={<AcceptClubInvite />} />
      </Route>

      {/* Public forms (sin auth) */}
      <Route path="/public/wellness/:token" element={lazy_(<WellnessForm />)} />
      <Route path="/public/pre-wellness/:token" element={lazy_(<PreWellnessForm />)} />
      <Route path="/public/training-session/:token" element={lazy_(<TrainingSessionShare />)} />
      <Route path="/public/set-piece/:token" element={lazy_(<SetPieceShare />)} />
      <Route path="/public/match-sheet-abp/:token" element={lazy_(<SetPieceShare />)} />
      <Route path="/friendship/accept/:token" element={lazy_(<FriendshipAccept />)} />
      <Route path="/ops" element={lazy_(<OpsDashboard />)} />

      {/* Subscription (auth required, no app layout) */}
      <Route path="/subscribe" element={SubscribeRoute} />
      <Route path="/suscripcion" element={<LangSubscribe lang="es" />} />
      <Route path="/en/subscribe" element={<LangSubscribe lang="en" />} />
      <Route path="/es/subscribe" element={<Navigate to="/suscripcion" replace />} />
      <Route path="/es/suscripcion" element={<Navigate to="/suscripcion" replace />} />
      {/* Club plan dedicated checkout */}
      <Route path="/subscribe-club" element={SubscribeClubRoute} />
      <Route path="/en/subscribe-club" element={SubscribeClubRoute} />
      <Route
        path="/payment/success"
        element={(
          <ProtectedRoute>
            {lazy_(<PaymentSuccess />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path="/es/payment/success"
        element={(
          <ProtectedRoute>
            {lazy_(<PaymentSuccess />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path="/en/payment/success"
        element={(
          <ProtectedRoute>
            {lazy_(<PaymentSuccess />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path="/payment/paypal/success"
        element={(
          <ProtectedRoute>
            {lazy_(<PayPalSuccess />)}
          </ProtectedRoute>
        )}
      />

      {/* Alta inicial: protegida, pero sin menú/header de la app */}
      <Route
        path="/season/create"
        element={(
          <ProtectedRoute>
            {lazy_(<CreateSeason />)}
          </ProtectedRoute>
        )}
      />

      {/* Coach setup (after invitation reset password) */}
      <Route
        path="/coach-setup"
        element={(
          <ProtectedRoute>
            {lazy_(<CoachSetup />)}
          </ProtectedRoute>
        )}
      />

      {/* App (protegidas) */}
      <Route
        element={
          <ProtectedRoute>
            <RequireSeason>
              <AppLayout />
            </RequireSeason>
          </ProtectedRoute>
        }
      >
        <Route path="/app" element={lazy_(<Home />)} />
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/season" element={lazy_(<Season />)} />
        <Route path="/tournaments" element={lazy_(<Tournaments />)} />
        <Route path="/players" element={lazy_(<Players />)} />
        <Route path="/players/:id" element={lazy_(<PlayerProfile />)} />
        <Route path="/exercises/*" element={lazy_(<Exercises />)} />
        <Route path="/strength-exercises" element={lazy_(<DemoSubscribeGate><StrengthExercises /></DemoSubscribeGate>)} />
        <Route path="/strategies/*" element={lazy_(<Strategies />)} />
        <Route path="/set-pieces/*" element={lazy_(<SetPieces />)} />
        <Route path="/training" element={lazy_(<Training />)} />
        <Route path="/my-videos" element={lazy_(<MyVideos />)} />
        <Route path="/video-editor" element={lazy_(<VideoEditor />)} />
        <Route path="/methodology" element={lazy_(<DemoSubscribeGate><Methodology /></DemoSubscribeGate>)} />
        <Route path="/goalkeeper-methodology" element={lazy_(<DemoSubscribeGate><GoalkeeperMethodology /></DemoSubscribeGate>)} />
        <Route path="/wellness" element={lazy_(<DemoSubscribeGate><WellnessManagement /></DemoSubscribeGate>)} />
        <Route path="/wellness/templates" element={lazy_(<DemoSubscribeGate><WellnessTemplates /></DemoSubscribeGate>)} />
        <Route path="/rivals" element={lazy_(<Rivals />)} />
        <Route path="/match-sheets" element={lazy_(<MatchSheets />)} />
        <Route path="/injuries" element={lazy_(<Injuries />)} />
        <Route path="/injuries/statistics" element={lazy_(<InjuryStatistics />)} />
        <Route path="/injury-prevention" element={lazy_(<DemoSubscribeGate><InjuryPrevention /></DemoSubscribeGate>)} />
        <Route path="/rival-analysis/*" element={lazy_(<RivalAnalysis />)} />
        <Route path="/scouting" element={lazy_(<Scouting />)} />
        <Route path="/anthropometry" element={lazy_(<Anthropometry />)} />
        <Route path="/statistics" element={lazy_(<Statistics />)} />
        <Route path="/nutrition" element={lazy_(<DemoSubscribeGate><Nutrition /></DemoSubscribeGate>)} />
        <Route path="/profile" element={lazy_(<Profile />)} />
        <Route path="/friends" element={lazy_(<Friends />)} />
        <Route path="/notifications" element={lazy_(<Notifications />)} />
        <Route path="/club/dashboard" element={lazy_(<ClubDashboard />)} />
        
      </Route>

      {/* Tactical Board: layout fullscreen sin sidebar */}
      <Route
        element={
          <ProtectedRoute>
            <RequireSeason>
              <FullscreenLayout />
            </RequireSeason>
          </ProtectedRoute>
        }
      >
        <Route path="/tactical-board" element={lazy_(<TacticalBoardPage />)} />
      </Route>

      <Route path="/index" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
