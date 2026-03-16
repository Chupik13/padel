import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SlideMenu from './SlideMenu';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="layout">
      <header className="layout-header">
        <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label={t('menu.openMenu')}>
          <span /><span /><span />
        </button>
        <div className="wordmark" onClick={() => navigate('/play')} style={{ cursor: 'pointer' }}>
            <span className="letter-G">G</span>
            <span className="letter-e">e</span>
            <span className="letter-o1">o</span>
            <span className="letter-r">r</span>
            <span className="letter-g">g</span>
            <span className="letter-i">i</span>
            <span className="letter-a">a</span>
            <span className="letter-n">n</span>
            <span className="letter-o2">o</span>
        </div>
        <button className="header-settings-btn" onClick={() => navigate('/settings')} aria-label={t('settings.title')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </header>
      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
