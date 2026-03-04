import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tournament, Player, Match } from '../types';

interface Props {
  tournament: Tournament;
  onUpdateScore: (matchIndex: number, score1: number | undefined, score2: number | undefined) => void;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  onCancel?: () => void;
  onEarlyFinish?: () => void;
  readOnly?: boolean;
  hostName?: string;
}

function getPlayer(players: Player[], id: number): Player | undefined {
  return players.find((p) => p.id === id);
}

function PlayerAvatar({ player }: { player: Player }) {
  return (
    <span className="avatar avatar-xs">
      {player.imageUrl ? <img src={player.imageUrl} alt="" /> : <span>{player.name[0]}</span>}
    </span>
  );
}

function computeStandings(players: Player[], matches: Match[], upTo: number) {
  const statsMap = new Map<number, { player: Player; points: number; pointsAgainst: number; matches: number; wins: number; losses: number }>();
  for (const p of players) {
    statsMap.set(p.id, { player: p, points: 0, pointsAgainst: 0, matches: 0, wins: 0, losses: 0 });
  }
  for (let i = 0; i < upTo; i++) {
    const m = matches[i];
    if (m.score1 === undefined) continue;
    const s1 = m.score1 ?? 0;
    const s2 = m.score2 ?? 0;
    for (const id of m.team1) {
      const st = statsMap.get(id)!;
      st.points += s1; st.pointsAgainst += s2; st.matches++;
      if (s1 > s2) st.wins++; else if (s2 > s1) st.losses++;
    }
    for (const id of m.team2) {
      const st = statsMap.get(id)!;
      st.points += s2; st.pointsAgainst += s1; st.matches++;
      if (s2 > s1) st.wins++; else if (s1 > s2) st.losses++;
    }
  }
  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.points - b.pointsAgainst) - (a.points - a.pointsAgainst);
  });
}

export default function MatchView({ tournament, onUpdateScore, onNext, onPrev, onFinish, onCancel, onEarlyFinish, readOnly = false, hostName }: Props) {
  const { players, matches, currentMatchIndex } = tournament;
  const safeIndex = matches.length > 0 ? Math.min(currentMatchIndex, matches.length - 1) : 0;
  const match = matches.length > 0 ? matches[safeIndex] : undefined;
  const isLast = safeIndex === matches.length - 1;
  const isFirst = safeIndex === 0;
  const { t } = useTranslation();

  const [score1, setScore1] = useState(match?.score1?.toString() ?? '');
  const [score2, setScore2] = useState(match?.score2?.toString() ?? '');
  const [showEarlyFinishModal, setShowEarlyFinishModal] = useState(false);

  useEffect(() => {
    setScore1(match?.score1?.toString() ?? '');
    setScore2(match?.score2?.toString() ?? '');
  }, [safeIndex, match?.score1, match?.score2]);

  if (!match) {
    return (
      <div className="screen center-content">
        <p className="subtitle">{t('match.noMatches')}</p>
        {onCancel && (
          <button className="btn btn-danger" style={{ maxWidth: 360, width: '100%', flex: 'none' }} onClick={onCancel}>
            {t('match.cancelTournament')}
          </button>
        )}
      </div>
    );
  }

  const saveScores = () => {
    if (readOnly) return;
    if (score1 === '' && score2 === '') return;
    const s1 = score1 === '' ? undefined : parseInt(score1) || 0;
    const s2 = score2 === '' ? undefined : parseInt(score2) || 0;
    onUpdateScore(safeIndex, s1, s2);
  };

  const handleNext = () => {
    saveScores();
    if (isLast) {
      onFinish();
    } else {
      onNext();
    }
  };

  const handlePrev = () => {
    saveScores();
    onPrev();
  };

  const progress = ((safeIndex + 1) / matches.length) * 100;

  return (
    <div className="screen">
      {readOnly && (
        <div className="spectator-badge">
          {t('match.spectator')}{hostName && <span className="host-badge"> &middot; {t('match.host', { name: hostName })}</span>}
        </div>
      )}
      {showEarlyFinishModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>{t('match.earlyFinishConfirm')}</p>
            <div className="button-row">
              <button className="btn btn-secondary" onClick={() => setShowEarlyFinishModal(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-danger" onClick={() => { setShowEarlyFinishModal(false); onEarlyFinish?.(); }}>
                {t('match.finishBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="match-header">
        {!readOnly && onEarlyFinish && (
          <button className="cancel-tournament-link early-finish-link" onClick={() => setShowEarlyFinishModal(true)}>
            {t('match.earlyFinish')}
          </button>
        )}
        {!readOnly && onCancel && (
          <button className="cancel-tournament-link" onClick={onCancel}>
            {t('match.cancel')}
          </button>
        )}
        <span className="match-counter">
          {t('match.counter', { current: safeIndex + 1, total: matches.length })}
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="match-teams">
        <div className="team-card">
          <div className="team-label">{t('match.team1')}</div>
          <div className="team-players">
            {match.team1.map((id) => {
              const p = getPlayer(players, id);
              return p ? (
                <span key={id} className="team-player-name"><PlayerAvatar player={p} /> {p.name}</span>
              ) : (
                <span key={id}>#{id}</span>
              );
            })}
          </div>
          <input
            className="score-input"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={score1}
            disabled={readOnly}
            onChange={(e) => {
              const val = e.target.value;
              setScore1(val);
              const num = parseInt(val);
              if (val !== '' && !isNaN(num) && num >= 0 && num <= 16) {
                setScore2((16 - num).toString());
              }
            }}
            onBlur={saveScores}
          />
        </div>

        <div className="vs">VS</div>

        <div className="team-card">
          <div className="team-label">{t('match.team2')}</div>
          <div className="team-players team-players-right">
            {match.team2.map((id) => {
              const p = getPlayer(players, id);
              return p ? (
                <span key={id} className="team-player-name">{p.name} <PlayerAvatar player={p} /></span>
              ) : (
                <span key={id}>#{id}</span>
              );
            })}
          </div>
          <input
            className="score-input"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={score2}
            disabled={readOnly}
            onChange={(e) => {
              const val = e.target.value;
              setScore2(val);
              const num = parseInt(val);
              if (val !== '' && !isNaN(num) && num >= 0 && num <= 16) {
                setScore1((16 - num).toString());
              }
            }}
            onBlur={saveScores}
          />
        </div>
      </div>

      {match.resting.length > 0 && (
        <div className="resting">
          {t('match.resting', { names: match.resting.map((id) => getPlayer(players, id)?.name ?? `#${id}`).join(', ') })}
        </div>
      )}

      <details className="spoiler">
        <summary className="spoiler-summary">{t('match.standings')}</summary>
        <div className="spoiler-content">
          <table className="results-table">
            <thead>
              <tr><th>#</th><th>{t('table.name')}</th><th>{t('table.points')}</th><th>{t('table.matches')}</th><th>{t('table.wins')}</th><th>{t('table.losses')}</th></tr>
            </thead>
            <tbody>
              {computeStandings(players, matches, safeIndex).map((st, i) => (
                <tr key={st.player.id}>
                  <td>{i + 1}</td>
                  <td>{st.player.name}</td>
                  <td className="points-cell">{st.points}</td>
                  <td>{st.matches}</td>
                  <td>{st.wins}</td>
                  <td>{st.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="spoiler">
        <summary className="spoiler-summary">{t('match.matchTable')}</summary>
        <div className="spoiler-content">
          <table className="results-table">
            <thead>
              <tr><th style={{ width: '1.5em' }}>#</th><th style={{ width: '45%', textAlign: 'right' }}>{t('match.team1')}</th><th style={{ width: 'auto', textAlign: 'center' }}></th><th style={{ width: '45%' }}>{t('match.team2')}</th></tr>
            </thead>
            <tbody>
              {matches.map((m, i) => (
                <tr key={i} className={i === safeIndex ? 'current-match-row' : ''}>
                  <td>{i + 1}</td>
                  <td style={{ textAlign: 'right' }}>{getPlayer(players, m.team1[0])?.name ?? `#${m.team1[0]}`}, {getPlayer(players, m.team1[1])?.name ?? `#${m.team1[1]}`}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {m.score1 !== undefined ? `${m.score1}:${m.score2}` : 'vs'}
                  </td>
                  <td>{getPlayer(players, m.team2[0])?.name ?? `#${m.team2[0]}`}, {getPlayer(players, m.team2[1])?.name ?? `#${m.team2[1]}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {!readOnly && (
        <div className="button-row">
          <button className="btn btn-secondary" onClick={handlePrev} disabled={isFirst}>
            {t('common.back')}
          </button>
          <button className="btn btn-primary" onClick={handleNext}>
            {isLast ? t('match.finish') : t('match.next')}
          </button>
        </div>
      )}

    </div>
  );
}
