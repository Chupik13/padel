import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SlideMenu({ open, onClose }: Props) {
  const { user, miniProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/login');
  };

  const navItems = [
    { label: 'Играть', path: '/play' },
    { label: 'Профиль', path: '/profile' },
    { label: 'Турниры', path: '/tournaments' },
    { label: 'Сезон', path: '/seasons' },
  ];

  return (
    <>
      <div className={`slide-menu-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <nav className={`slide-menu ${open ? 'open' : ''}`}>
        <div className="slide-menu-header">
          <div className="avatar avatar-lg">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={user.name} />
            ) : (
              <span>{(miniProfile?.name ?? user?.name ?? '?')[0].toUpperCase()}</span>
            )}
          </div>
          <div className="slide-menu-user-name">{miniProfile?.name ?? user?.name}</div>
          {miniProfile && miniProfile.seasonScore > 0 && (
            <div className="slide-menu-rating">Рейтинг: {miniProfile.seasonScore.toFixed(1)}</div>
          )}
        </div>
        <div className="slide-menu-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`slide-menu-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleNav(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="slide-menu-footer">
          <button className="slide-menu-item logout" onClick={handleLogout}>
            Выход
          </button>
        </div>
      </nav>
    </>
  );
}
