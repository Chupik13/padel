import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getClubMembers } from '../api/clubs';
import { getBadgeTypes, getPlayerBadges, assignBadge, removeBadge } from '../api/badges';
import { getSeasons } from '../api/seasons';
import type { PlayerResult, BadgeTypeResult, PlayerBadgeResult, SeasonResult } from '../types/api';

export default function AwardsAdminPage() {
  const { user, miniProfile } = useAuth();
  const { t, i18n } = useTranslation();

  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<BadgeTypeResult[]>([]);
  const [seasons, setSeasons] = useState<SeasonResult[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [playerBadges, setPlayerBadges] = useState<PlayerBadgeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [seasonSelects, setSeasonSelects] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const clubId = miniProfile?.clubId;
        const [types, members, allSeasons] = await Promise.all([
          getBadgeTypes(),
          clubId ? getClubMembers(clubId) : Promise.resolve([]),
          getSeasons(),
        ]);
        setBadgeTypes(types);
        setPlayers(members);
        const sorted = [...allSeasons].sort(
          (a, b) => new Date(b.seasonStart).getTime() - new Date(a.seasonStart).getTime(),
        );
        setSeasons(sorted);
      } catch {
        setError(t('awards.loadError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [miniProfile?.clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedPlayerId) {
      setPlayerBadges([]);
      return;
    }

    let cancelled = false;
    getPlayerBadges(selectedPlayerId)
      .then((badges) => { if (!cancelled) setPlayerBadges(badges); })
      .catch(() => { if (!cancelled) setPlayerBadges([]); });
    return () => { cancelled = true; };
  }, [selectedPlayerId]);

  const badgeMap = useMemo(() => {
    const map = new Map<number, PlayerBadgeResult[]>();
    for (const b of playerBadges) {
      const arr = map.get(b.badgeTypeId) || [];
      arr.push(b);
      map.set(b.badgeTypeId, arr);
    }
    return map;
  }, [playerBadges]);

  const seasonLabels = useMemo(
    () => seasons.map((_, i) => t('seasons.seasonNumber', { number: seasons.length - i })),
    [seasons, t],
  );

  const handleToggleOn = async (badgeType: BadgeTypeResult) => {
    if (!selectedPlayerId) return;
    setTogglingId(badgeType.id);
    setError('');
    try {
      await assignBadge({
        playerId: selectedPlayerId,
        badgeTypeId: badgeType.id,
        note: seasonSelects[badgeType.id] || undefined,
      });
      const updated = await getPlayerBadges(selectedPlayerId);
      setPlayerBadges(updated);
      setSeasonSelects((prev) => ({ ...prev, [badgeType.id]: '' }));
    } catch {
      setError(t('awards.assignError'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleOff = async (badge: PlayerBadgeResult) => {
    if (!selectedPlayerId) return;
    setTogglingId(badge.badgeTypeId);
    setError('');
    try {
      await removeBadge(badge.id);
      const updated = await getPlayerBadges(selectedPlayerId);
      setPlayerBadges(updated);
    } catch {
      setError(t('awards.removeError'));
    } finally {
      setTogglingId(null);
    }
  };

  if (!(user?.isAdmin)) {
    return (
      <div className="screen center-content">
        <p className="error">{t('awards.noAccess')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  return (
    <div className="screen">
      <h2 className="screen-title">{t('awards.title')}</h2>

      <div className="stats-card">
        <h3 className="stats-card-title">{t('awards.selectPlayer')}</h3>
        <div className="awards-player-list">
          {players.map((p) => (
            <button
              key={p.id}
              className={`awards-player-btn${selectedPlayerId === p.id ? ' active' : ''}`}
              onClick={() => {
                setSelectedPlayerId(p.id);
                setSeasonSelects({});
              }}
            >
              <div className="avatar avatar-sm">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span>{p.name[0].toUpperCase()}</span>}
              </div>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedPlayer && (
        <div className="stats-card">
          <h3 className="stats-card-title">{t('awards.badges')}</h3>
          <div className="awards-checklist">
            {badgeTypes.flatMap((bt) => {
              const existing = badgeMap.get(bt.id) || [];
              const isToggling = togglingId === bt.id;
              const usedSeasons = new Set(existing.map((b) => b.note).filter(Boolean));
              const availableSeasons = seasonLabels.filter((l) => !usedSeasons.has(l));
              const canAdd = !!seasonSelects[bt.id];
              const badgeName = i18n.language === 'ru' ? bt.nameRu : bt.nameEn;
              const badgeIcon = bt.emoji.startsWith('/')
                ? <img src={bt.emoji} alt="" className="badge-icon" />
                : bt.emoji;

              const cards: React.ReactNode[] = [];

              {/* Existing awards — each as its own card */}
              existing.forEach((badge) => {
                cards.push(
                  <div key={`badge-${badge.id}`} className="awards-checklist-item active">
                    <div className="awards-checklist-row">
                      <span className="award-medal">{badgeIcon}</span>
                      <span className="awards-checklist-name">{badgeName}</span>
                      <button
                        className="awards-toggle on"
                        onClick={() => handleToggleOff(badge)}
                        disabled={isToggling}
                      >
                        <span className="awards-toggle-knob" />
                      </button>
                    </div>
                    <div className="awards-checklist-note">
                      <span className="awards-note-text">
                        {badge.note || t('awards.noSeason')}
                      </span>
                    </div>
                  </div>
                );
              });

              {/* Template card for new award */}
              {availableSeasons.length > 0 && cards.push(
                <div key={`new-${bt.id}`} className="awards-checklist-item">
                  <div className="awards-checklist-row">
                    <span className="award-medal">{badgeIcon}</span>
                    <span className="awards-checklist-name">{badgeName}</span>
                    <button
                      className={`awards-toggle${canAdd ? '' : ' disabled'}`}
                      onClick={() => handleToggleOn(bt)}
                      disabled={isToggling || !canAdd}
                    >
                      <span className="awards-toggle-knob" />
                    </button>
                  </div>
                  <div className="awards-checklist-note">
                    <select
                      className="awards-select"
                      value={seasonSelects[bt.id] ?? ''}
                      onChange={(e) => setSeasonSelects((prev) => ({ ...prev, [bt.id]: e.target.value }))}
                    >
                      <option value="">{t('awards.selectSeason')}</option>
                      {availableSeasons.map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              return cards;
            })}
          </div>
          {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
