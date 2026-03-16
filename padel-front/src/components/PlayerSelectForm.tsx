import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getClubMembers } from '../api/clubs';
import { getPlayers } from '../api/players';
import type { PlayerResult } from '../types/api';

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 7;

interface Props {
  clubId?: number;
  onSubmit: (players: PlayerResult[], lateIds: Set<number>) => void;
  onBack: () => void;
}

export default function PlayerSelectForm({ clubId, onSubmit, onBack }: Props) {
  const [allPlayers, setAllPlayers] = useState<PlayerResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hasLate, setHasLate] = useState(false);
  const [lateIds, setLateIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const maxLate = selected.size - 4;

  useEffect(() => {
    const load = clubId ? getClubMembers(clubId) : getPlayers();
    load
      .then(setAllPlayers)
      .catch(() => setError(t('playerSelect.loadError')))
      .finally(() => setLoading(false));
  }, [clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Remove from late if deselected
        setLateIds((l) => { const n = new Set(l); n.delete(id); return n; });
      } else if (next.size < MAX_PLAYERS) {
        next.add(id);
      }
      return next;
    });
  };

  const toggleLate = (id: number) => {
    setLateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxLate) next.add(id);
      return next;
    });
  };

  const handleToggleHasLate = () => {
    if (hasLate) {
      setLateIds(new Set());
    }
    setHasLate(!hasLate);
  };

  const handleSubmit = () => {
    if (selected.size < MIN_PLAYERS || selected.size > MAX_PLAYERS) return;
    const players = allPlayers.filter((p) => selected.has(p.id));
    onSubmit(players, hasLate ? lateIds : new Set());
  };

  const selectedPlayers = allPlayers.filter((p) => selected.has(p.id));

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="screen">
      <h2 className="screen-title">{t('playerSelect.titleRange')}</h2>
      <p className="subtitle">{t('playerSelect.selectedRange', { selected: selected.size, min: MIN_PLAYERS, max: MAX_PLAYERS })}</p>
      {error && <p className="error">{error}</p>}
      <div className="player-chips">
        {allPlayers.map((player) => (
          <button
            key={player.id}
            className={`player-chip ${selected.has(player.id) ? 'selected' : ''}`}
            onClick={() => toggle(player.id)}
          >
            <div className="avatar avatar-sm">
              {player.imageUrl ? (
                <img src={player.imageUrl} alt={player.name} />
              ) : (
                <span>{player.name[0].toUpperCase()}</span>
              )}
            </div>
            <span className="player-chip-name">{player.name}</span>
          </button>
        ))}
      </div>

      {selected.size >= 5 && (
        <div className="late-section">
          <label className="late-checkbox" onClick={handleToggleHasLate}>
            <span className={`checkbox-box${hasLate ? ' checked' : ''}`} />
            <span>{t('lateSelect.checkbox')}</span>
          </label>

          {hasLate && (
            <>
              <p className="late-hint">{t('lateSelect.subtitle', { max: maxLate })}</p>
              <div className="player-chips">
                {selectedPlayers.map((player) => {
                  const isLate = lateIds.has(player.id);
                  const isDisabled = !isLate && lateIds.size >= maxLate;
                  return (
                    <button
                      key={player.id}
                      className={`player-chip${isLate ? ' late-selected' : ''}`}
                      disabled={isDisabled}
                      onClick={() => toggleLate(player.id)}
                    >
                      <div className="avatar avatar-sm">
                        {player.imageUrl ? (
                          <img src={player.imageUrl} alt={player.name} />
                        ) : (
                          <span>{player.name[0].toUpperCase()}</span>
                        )}
                      </div>
                      <span className="player-chip-name">{player.name}</span>
                      {isLate && <span className="late-badge">{t('lateSelect.lateBadge')}</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div className="button-row">
        <button className="btn btn-secondary" onClick={onBack}>
          {t('common.back')}
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={selected.size < MIN_PLAYERS}>
          {t('playerSelect.submit')}
        </button>
      </div>
    </div>
  );
}
