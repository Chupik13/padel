import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ClubGuard from './components/ClubGuard';
import EmailPrompt from './components/EmailPrompt';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ClubSelectPage from './pages/ClubSelectPage';
import PlayPage from './pages/PlayPage';
import ProfilePage from './pages/ProfilePage';
import TournamentsPage from './pages/TournamentsPage';
import SeasonsPage from './pages/SeasonsPage';
import ChangelogPage from './pages/ChangelogPage';
import { useAuth } from './context/AuthContext';
import './App.css';

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const versionChecked = useRef(false);

  useEffect(() => {
    if (loading || !user || versionChecked.current) return;
    versionChecked.current = true;
    const lastSeen = localStorage.getItem('lastSeenVersion');
    if (lastSeen !== __APP_VERSION__) {
      localStorage.setItem('lastSeenVersion', __APP_VERSION__);
      if (location.pathname !== '/changelog') {
        navigate('/changelog?highlight=latest', { replace: true });
      }
    }
  }, [loading, user, navigate, location.pathname]);

  return (
    <div className="app">
      {user && !user.hasEmail && <EmailPrompt />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/club" element={<ClubSelectPage />} />
            <Route element={<ClubGuard />}>
              <Route path="/play" element={<PlayPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:login" element={<ProfilePage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/seasons" element={<SeasonsPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </div>
  );
}
