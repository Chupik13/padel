import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PlayPage from './pages/PlayPage';
import ProfilePage from './pages/ProfilePage';
import TournamentsPage from './pages/TournamentsPage';
import SeasonsPage from './pages/SeasonsPage';
import ChangelogPage from './pages/ChangelogPage';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/play" element={<PlayPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:login" element={<ProfilePage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/seasons" element={<SeasonsPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </div>
  );
}
