import { useState } from 'react';

export type GuidePage = 'play' | 'profile' | 'tournaments' | 'seasons' | 'club';

const SHOW_KEY = 'showGuides';
const DISMISSED_KEY = 'dismissed-guides';
const ALL_PAGES: GuidePage[] = ['play', 'profile', 'tournaments', 'seasons', 'club'];

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function useGuide(page: GuidePage) {
  const [showGuide, setShowGuide] = useState(() => {
    if (localStorage.getItem(SHOW_KEY) !== 'true') return false;
    return !getDismissed().has(page);
  });

  const dismissGuide = () => {
    const dismissed = getDismissed();
    dismissed.add(page);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
    if (ALL_PAGES.every(p => dismissed.has(p))) {
      localStorage.removeItem(SHOW_KEY);
    }
    setShowGuide(false);
  };

  return { showGuide, dismissGuide };
}

export function areGuidesEnabled(): boolean {
  if (localStorage.getItem(SHOW_KEY) !== 'true') return false;
  const dismissed = getDismissed();
  return ALL_PAGES.some(p => !dismissed.has(p));
}

export function resetAllGuides() {
  localStorage.setItem(SHOW_KEY, 'true');
  localStorage.removeItem(DISMISSED_KEY);
}

export function disableAllGuides() {
  localStorage.removeItem(SHOW_KEY);
}
