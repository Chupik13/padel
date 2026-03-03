import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SlideMenu from './SlideMenu';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="layout">
      <header className="layout-header">
        <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Открыть меню">
          <span /><span /><span />
        </button>
        <span className="layout-title">Грузиано</span>
      </header>
      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
