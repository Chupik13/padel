import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TournamentResult } from '../types/api';
import { computePartnerStats } from '../utils/partnerStats';

interface Props {
  tournaments: TournamentResult[];
  playerId: number;
}

export default function PartnerStats({ tournaments, playerId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const stats = computePartnerStats(tournaments, playerId);
  if (stats.length === 0) {
    return <p className="subtitle" style={{ fontSize: '0.85rem' }}>{t('profile.noPartners')}</p>;
  }

  const visible = showAll ? stats : stats.slice(0, 5);

  return (
    <>
      <div className="partner-list">
        {visible.map((p) => (
          <div key={p.playerId} className="partner-row" onClick={() => navigate(`/profile/${p.playerLogin}`)}>
            <span className="avatar avatar-xs">
              {p.playerImageUrl ? (
                <img src={p.playerImageUrl} alt="" />
              ) : (
                <span>{p.playerName[0]}</span>
              )}
            </span>
            <span className="partner-name">{p.playerName}</span>
            <span className="partner-stat">{p.gamesTogether} {t('profile.gamesTogether')}</span>
            <span className="partner-stat partner-winrate">{p.winRate}%</span>
          </div>
        ))}
      </div>
      {stats.length > 5 && (
        <button className="partner-toggle" onClick={() => setShowAll(!showAll)}>
          {showAll ? t('profile.showLess') : t('profile.showAll')}
        </button>
      )}
    </>
  );
}
