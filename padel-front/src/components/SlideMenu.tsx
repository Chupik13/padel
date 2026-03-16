import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SlideMenu({ open, onClose }: Props) {
  const { user, miniProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const setLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

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
    { label: t('menu.play'), path: '/play' },
    { label: t('menu.profile'), path: '/profile' },
    { label: t('menu.tournaments'), path: '/tournaments' },
    { label: t('menu.seasons'), path: '/seasons' },
    { label: t('menu.club'), path: '/club' },
    ...(user?.isAdmin ? [
      { label: t('menu.awards'), path: '/awards' },
      { label: t('menu.logs'), path: '/logs' },
    ] : []),
    { label: t('menu.changelog'), path: '/changelog' },
    { label: t('menu.feedback'), path: '/feedback' },
  ];

  return (
    <>
      <div className={`slide-menu-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <nav className={`slide-menu ${open ? 'open' : ''}`}>
        <div className="slide-menu-header">
          <div className="slide-menu-header-top">
            <div className={`avatar-wrapper${user?.isAdmin ? ' admin' : ''}`}>
              <div className="avatar avatar-lg">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt={user.name} />
                ) : (
                  <span>{(miniProfile?.name ?? user?.name ?? '?')[0].toUpperCase()}</span>
                )}
              </div>
            </div>
            <div className="slide-menu-user-name">{miniProfile?.name ?? user?.name}</div>
          </div>
          {(miniProfile?.clubName || (miniProfile && miniProfile.seasonScore > 0)) && (
            <div className="slide-menu-meta">
              {miniProfile?.clubName && (
                <div className="slide-menu-club">
                  {miniProfile.clubName}
                </div>
              )}
              {miniProfile && miniProfile.seasonScore > 0 && (
                <div className="slide-menu-rating">{t('menu.rating', { score: miniProfile.seasonScore.toFixed(1) })}</div>
              )}
            </div>
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
            {t('menu.logout')}
          </button>
          <div className="lang-toggle-bar">
            <button
              className={`lang-toggle-btn ${i18n.language === 'ru' ? 'active' : ''}`}
              onClick={() => setLang('ru')}
            >
              RU
            </button>
            <button
              className={`lang-toggle-btn ${i18n.language === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
