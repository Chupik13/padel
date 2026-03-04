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
        <span className="layout-title">{t('app.title')}</span>
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
