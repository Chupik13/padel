import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getClubMembers } from '../api/clubs';
import { getPlayers } from '../api/players';
import type { PlayerResult } from '../types/api';

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 6;

interface Props {
  clubId?: number;
  onSubmit: (players: PlayerResult[]) => void;
  onBack: () => void;
}

export default function PlayerSelectForm({ clubId, onSubmit, onBack }: Props) {
  const [allPlayers, setAllPlayers] = useState<PlayerResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useTranslation();

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
      } else if (next.size < MAX_PLAYERS) {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size < MIN_PLAYERS || selected.size > MAX_PLAYERS) return;
    const players = allPlayers.filter((p) => selected.has(p.id));
    onSubmit(players);
  };

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
