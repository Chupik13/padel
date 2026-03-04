import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { HeadToHeadResult } from '../types/api';
import { getHeadToHead } from '../api/profile';

interface Props {
  targetLogin: string;
}

export default function HeadToHead({ targetLogin }: Props) {
  const { t } = useTranslation();
  const [h2h, setH2h] = useState<HeadToHeadResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHeadToHead(targetLogin)
      .then(setH2h)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetLogin]);

  if (loading) return <div className="stats-card"><div className="loading-spinner" style={{ margin: '12px auto' }} /></div>;

  if (!h2h || (h2h.matchesAsOpponents === 0 && h2h.matchesAsPartners === 0)) {
    return (
      <div className="stats-card">
        <h3 className="stats-card-title">{t('profile.headToHead')}</h3>
        <p className="subtitle" style={{ fontSize: '0.9rem' }}>{t('profile.noH2H')}</p>
      </div>
    );
  }

  const totalOpponent = h2h.matchesAsOpponents;
  const p1Pct = totalOpponent > 0 ? Math.round((h2h.player1Wins / totalOpponent) * 100) : 0;
  const p2Pct = totalOpponent > 0 ? Math.round((h2h.player2Wins / totalOpponent) * 100) : 0;

  return (
    <div className="stats-card">
      <h3 className="stats-card-title">{t('profile.headToHead')}</h3>

      {h2h.matchesAsOpponents > 0 && (
        <div className="h2h-section">
          <div className="h2h-section-title">{t('profile.asOpponents')}</div>
          <div className="h2h-bar-container">
            <div className="h2h-bar-label">{h2h.player1.name}</div>
            <div className="h2h-bar">
              <div
                className="h2h-bar-fill h2h-bar-p1"
                style={{ width: `${p1Pct || (p2Pct === 0 ? 50 : 0)}%` }}
              />
              <div
                className="h2h-bar-fill h2h-bar-p2"
                style={{ width: `${p2Pct || (p1Pct === 0 ? 50 : 0)}%` }}
              />
            </div>
            <div className="h2h-bar-label h2h-bar-label-right">{h2h.player2.name}</div>
          </div>
          <div className="h2h-stats-row">
            <span className="h2h-stat-value">{h2h.player1Wins} {t('profile.wins')}</span>
            {h2h.draws > 0 && <span className="h2h-stat-draw">{h2h.draws} {t('profile.draws')}</span>}
            <span className="h2h-stat-value">{h2h.player2Wins} {t('profile.wins')}</span>
          </div>
          <div className="h2h-stats-row">
            <span className="h2h-stat-avg">{t('profile.avgPoints')}: {h2h.player1AvgScore}</span>
            <span className="h2h-stat-avg">{t('profile.avgPoints')}: {h2h.player2AvgScore}</span>
          </div>
        </div>
      )}

      {h2h.matchesAsPartners > 0 && (
        <div className="h2h-section" style={{ marginTop: h2h.matchesAsOpponents > 0 ? 12 : 0 }}>
          <div className="h2h-section-title">{t('profile.asPartners')}</div>
          <div className="h2h-partner-stats">
            <div className="stat-item">
              <span className="stat-value">{h2h.matchesAsPartners}</span>
              <span className="stat-label">{t('profile.gamesTogether')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{h2h.winsAsPartners}</span>
              <span className="stat-label">{t('profile.wins')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{h2h.winRateAsPartners}%</span>
              <span className="stat-label">{t('profile.winRate')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
