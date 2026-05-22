import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RequireSeason from './RequireSeason';
import AuthLayout from '@/layouts/AuthLayout';
import AppLayout from '@/layouts/AppLayout';
import FullscreenLayout from '@/layouts/FullscreenLayout';

import Welcome from '@/pages/auth/Welcome';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import NotFound from '@/pages/NotFound';

const Home = lazy(() => import('@/pages/Home'));
const Season = lazy(() => import('@/pages/Season'));
const CreateSeason = lazy(() => import('@/pages/CreateSeason'));
const Tournaments = lazy(() => import('@/pages/Tournaments'));
const Players = lazy(() => import('@/pages/Players'));
const PlayerProfile = lazy(() => import('@/pages/PlayerProfile'));
const Exercises = lazy(() => import('@/pages/Exercises'));
const Strategies = lazy(() => import('@/pages/Strategies'));
const Training = lazy(() => import('@/pages/Training'));
const MyVideos = lazy(() => import('@/pages/MyVideos'));
const Statistics = lazy(() => import('@/pages/Statistics'));
const Injuries = lazy(() => import('@/pages/Injuries'));
const InjuryStatistics = lazy(() => import('@/pages/InjuryStatistics'));
const InjuryPrevention = lazy(() => import('@/pages/InjuryPrevention'));
const MatchSheets = lazy(() => import('@/pages/MatchSheets'));
const RivalAnalysis = lazy(() => import('@/pages/RivalAnalysis'));
const Rivals = lazy(() => import('@/pages/Rivals'));
const Anthropometry = lazy(() => import('@/pages/Anthropometry'));
const Nutrition = lazy(() => import('@/pages/Nutrition'));
const Methodology = lazy(() => import('@/pages/Methodology'));
const GoalkeeperMethodology = lazy(() => import('@/pages/GoalkeeperMethodology'));
const WellnessTemplates = lazy(() => import('@/pages/WellnessTemplates'));
const WellnessManagement = lazy(() => import('@/pages/WellnessManagement'));
const Profile = lazy(() => import('@/pages/Profile'));
const TacticalBoardPage = lazy(() => import('@/pages/TacticalBoard'));
const VideoEditor = lazy(() => import('@/pages/VideoEditor'));
const Subscribe = lazy(() => import('@/pages/Subscribe'));
const PaymentSuccess = lazy(() => import('@/pages/PaymentSuccess'));

const WellnessForm = lazy(() => import('@/pages/public/WellnessForm'));
const PreWellnessForm = lazy(() => import('@/pages/public/PreWellnessForm'));

const RouteFallback = () => (
  <div style={{ padding: 24, color: 'inherit', opacity: 0.6 }} />
);

const lazy_ = (el) => <Suspense fallback={<RouteFallback />}>{el}</Suspense>;

export default function AppRouter() {
  return (
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/welcome" element={<Welcome />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Public forms (sin auth) */}
      <Route path="/public/wellness/:token" element={lazy_(<WellnessForm />)} />
      <Route path="/public/pre-wellness/:token" element={lazy_(<PreWellnessForm />)} />

      {/* Subscription (auth required, no app layout) */}
      <Route
        path="/subscribe"
        element={(
          <ProtectedRoute>
            {lazy_(<Subscribe />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path="/payment/success"
        element={(
          <ProtectedRoute>
            {lazy_(<PaymentSuccess />)}
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
        <Route path="/" element={lazy_(<Home />)} />
        <Route path="/season" element={lazy_(<Season />)} />
        <Route path="/tournaments" element={lazy_(<Tournaments />)} />
        <Route path="/players" element={lazy_(<Players />)} />
        <Route path="/players/:id" element={lazy_(<PlayerProfile />)} />
        <Route path="/exercises/*" element={lazy_(<Exercises />)} />
        <Route path="/strategies/*" element={lazy_(<Strategies />)} />
        <Route path="/training" element={lazy_(<Training />)} />
        <Route path="/my-videos" element={lazy_(<MyVideos />)} />
        <Route path="/video-editor" element={lazy_(<VideoEditor />)} />
        <Route path="/methodology" element={lazy_(<Methodology />)} />
        <Route path="/goalkeeper-methodology" element={lazy_(<GoalkeeperMethodology />)} />
        <Route path="/wellness" element={lazy_(<WellnessManagement />)} />
        <Route path="/wellness/templates" element={lazy_(<WellnessTemplates />)} />
        <Route path="/rivals" element={lazy_(<Rivals />)} />
        <Route path="/match-sheets" element={lazy_(<MatchSheets />)} />
        <Route path="/injuries" element={lazy_(<Injuries />)} />
        <Route path="/injuries/statistics" element={lazy_(<InjuryStatistics />)} />
        <Route path="/injury-prevention" element={lazy_(<InjuryPrevention />)} />
        <Route path="/rival-analysis/*" element={lazy_(<RivalAnalysis />)} />
        <Route path="/anthropometry" element={lazy_(<Anthropometry />)} />
        <Route path="/statistics" element={lazy_(<Statistics />)} />
        <Route path="/nutrition" element={lazy_(<Nutrition />)} />
        <Route path="/profile" element={lazy_(<Profile />)} />
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
