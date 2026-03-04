import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ClubGuard() {
  const { hasClub, loading } = useAuth();

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!hasClub) {
    return <Navigate to="/club" replace />;
  }

  return <Outlet />;
}
