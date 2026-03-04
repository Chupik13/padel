import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getPlayers } from '../api/players';
import type { PlayerResult } from '../types/api';

interface Props {
  count: number;
  onSubmit: (players: PlayerResult[]) => void;
  onBack: () => void;
}

export default function PlayerSelectForm({ count, onSubmit, onBack }: Props) {
  const [allPlayers, setAllPlayers] = useState<PlayerResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    getPlayers()
      .then(setAllPlayers)
      .catch(() => setError(t('playerSelect.loadError')))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < count) {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size !== count) return;
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
      <h2 className="screen-title">{t('playerSelect.title', { count })}</h2>
      <p className="subtitle">{t('playerSelect.selected', { selected: selected.size, count })}</p>
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
        <button className="btn btn-primary" onClick={handleSubmit} disabled={selected.size !== count}>
          {t('playerSelect.submit')}
        </button>
      </div>
    </div>
  );
}
