import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SlideMenu from './SlideMenu';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label={t('menu.openMenu')}>
          <span /><span /><span />
        </button>
        <div className="wordmark">
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
        <button className="lang-toggle" onClick={toggleLang}>
          {i18n.language === 'ru' ? 'EN' : 'RU'}
        </button>
      </header>
      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
