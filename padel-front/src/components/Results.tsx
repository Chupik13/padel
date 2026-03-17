import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tournament, Player } from '../types';
import { saveTournament as saveTournamentApi } from '../api/tournaments';
import type { SaveTournamentRequest } from '../types/api';

interface Props {
  tournament: Tournament;
  onRestart: () => void;
  onRematch?: () => void;
  inSeason?: boolean;
  isLive?: boolean;
}

type PlayerStats = {
  player: Player;
  points: number;
  pointsAgainst: number;
  matches: number;
  wins: number;
  losses: number;
};

export default function Results({ tournament, onRestart, onRematch, inSeason = false, isLive = false }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const { players, matches, format } = tournament;
  const { t } = useTranslation();

  const statsMap = new Map<number, PlayerStats>();
  for (const p of players) {
    statsMap.set(p.id, {
      player: p,
      points: 0,
      pointsAgainst: 0,
      matches: 0,
      wins: 0,
      losses: 0,
    });
  }

  for (const match of matches) {
    const s1 = match.score1 ?? 0;
    const s2 = match.score2 ?? 0;

    for (const id of match.team1) {
      const st = statsMap.get(id)!;
      st.points += s1;
      st.pointsAgainst += s2;
      st.matches++;
      if (s1 > s2) st.wins++;
      else if (s2 > s1) st.losses++;
    }

    for (const id of match.team2) {
      const st = statsMap.get(id)!;
      st.points += s2;
      st.pointsAgainst += s1;
      st.matches++;
      if (s2 > s1) st.wins++;
      else if (s1 > s2) st.losses++;
    }
  }

  const sorted = Array.from(statsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.points - a.pointsAgainst;
    const diffB = b.points - b.pointsAgainst;
    return diffB - diffA;
  });

  const ranks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      ranks.push(1);
    } else {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevDiff = prev.points - prev.pointsAgainst;
      const currDiff = curr.points - curr.pointsAgainst;
      if (curr.points === prev.points && currDiff === prevDiff) {
        ranks.push(ranks[i - 1]);
      } else {
        ranks.push(i + 1);
      }
    }
  }

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const request: SaveTournamentRequest = {
        isBalanced: format === 'balanced',
        inSeason,
        matches: matches.map((m) => ({
          teamOne: {
            firstPlayerId: m.team1[0],
            secondPlayerId: m.team1[1],
            score: m.score1 ?? 0,
          },
          teamTwo: {
            firstPlayerId: m.team2[0],
            secondPlayerId: m.team2[1],
            score: m.score2 ?? 0,
          },
        })),
      };
      await saveTournamentApi(request);
      setSaved(true);
    } catch {
      setError(t('results.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="screen">
      <h2 className="screen-title">{t('results.title')}</h2>
      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('table.name')}</th>
              <th>{t('table.points')}</th>
              <th>{t('table.matchesLong')}</th>
              <th>{t('table.wins')}</th>
              <th>{t('table.losses')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((st, i) => (
              <tr key={st.player.id} className={ranks[i] === 1 ? 'first-place' : ''} >
                <td >{ranks[i]}</td>
                <td>
                  <span style={{display: 'flex', alignItems: 'center', gap: 4}}>
                    <span className="avatar avatar-xs">
                      {st.player.imageUrl ? <img src={st.player.imageUrl} alt="" /> : <span>{st.player.name[0]}</span>}
                    </span>
                    {st.player.name}
                  </span>
                </td>
                <td className="points-cell">{st.points}</td>
                <td>{st.matches}</td>
                <td>{st.wins}</td>
                <td>{st.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="button-row">
        {isLive ? (
          <>
            {onRematch && (
              <button className="btn btn-primary" onClick={onRematch} style={{ flex: 1 }}>
                {t('results.rematch')}
              </button>
            )}
            <button className={`btn ${onRematch ? 'btn-secondary' : 'btn-primary'}`} onClick={onRestart} style={{ flex: 1 }}>
              {t('results.newGame')}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={onRestart}>
              {t('results.restart')}
            </button>
            <button className="btn btn-primary" onClick={saved ? onRestart : handleSave} disabled={saving}>
              {saved ? t('results.done') : saving ? t('results.saving') : t('results.save')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
