import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AuthLayout from '@/layouts/AuthLayout';
import AppLayout from '@/layouts/AppLayout';
import FullscreenLayout from '@/layouts/FullscreenLayout';

import Welcome from '@/pages/auth/Welcome';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';

import Home from '@/pages/Home';
import Season from '@/pages/Season';
import CreateSeason from '@/pages/CreateSeason';
import Tournaments from '@/pages/Tournaments';
import Players from '@/pages/Players';
import PlayerProfile from '@/pages/PlayerProfile';
import Exercises from '@/pages/Exercises';
import Strategies from '@/pages/Strategies';
import Training from '@/pages/Training';
import MyVideos from '@/pages/MyVideos';
import Statistics from '@/pages/Statistics';
import Injuries from '@/pages/Injuries';
import InjuryStatistics from '@/pages/InjuryStatistics';
import InjuryPrevention from '@/pages/InjuryPrevention';
import MatchSheets from '@/pages/MatchSheets';
import RivalAnalysis from '@/pages/RivalAnalysis';
import Rivals from '@/pages/Rivals';
import Anthropometry from '@/pages/Anthropometry';
import Nutrition from '@/pages/Nutrition';
import Methodology from '@/pages/Methodology';
import GoalkeeperMethodology from '@/pages/GoalkeeperMethodology';
import WellnessTemplates from '@/pages/WellnessTemplates';
import WellnessManagement from '@/pages/WellnessManagement';
import Profile from '@/pages/Profile';
import TacticalBoardPage from '@/pages/TacticalBoard';
import VideoEditor from '@/pages/VideoEditor';
import NotFound from '@/pages/NotFound';

import WellnessForm from '@/pages/public/WellnessForm';
import PreWellnessForm from '@/pages/public/PreWellnessForm';

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
      <Route path="/public/wellness/:token" element={<WellnessForm />} />
      <Route path="/public/pre-wellness/:token" element={<PreWellnessForm />} />

      {/* App (protegidas) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/season" element={<Season />} />
        <Route path="/season/create" element={<CreateSeason />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
        <Route path="/exercises/*" element={<Exercises />} />
        <Route path="/strategies/*" element={<Strategies />} />
        <Route path="/training" element={<Training />} />
        <Route path="/my-videos" element={<MyVideos />} />
        <Route path="/video-editor" element={<VideoEditor />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/goalkeeper-methodology" element={<GoalkeeperMethodology />} />
        <Route path="/wellness" element={<WellnessManagement />} />
        <Route path="/wellness/templates" element={<WellnessTemplates />} />
        <Route path="/rivals" element={<Rivals />} />
        <Route path="/match-sheets" element={<MatchSheets />} />
        <Route path="/injuries" element={<Injuries />} />
        <Route path="/injuries/statistics" element={<InjuryStatistics />} />
        <Route path="/injury-prevention" element={<InjuryPrevention />} />
        <Route path="/rival-analysis/*" element={<RivalAnalysis />} />
        <Route path="/anthropometry" element={<Anthropometry />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Tactical Board: layout fullscreen sin sidebar (replica UX landscape nativo) */}
      <Route
        element={
          <ProtectedRoute>
            <FullscreenLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/tactical-board" element={<TacticalBoardPage />} />
      </Route>

      <Route path="/index" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
