import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TournamentResult, MatchResult, PlayerResult } from '../types/api';
import { getTournaments } from '../api/tournaments';
import { useAuth } from '../context/AuthContext';
import InfoTip from '../components/InfoTip';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dateFmt = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    getTournaments()
      .then((data) => {
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTournaments(sorted);
      })
      .catch(() => setError(t('tournaments.loadError')))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getAllPlayers = (tr: TournamentResult): PlayerResult[] => {
    const map = new Map<number, PlayerResult>();
    for (const m of tr.matches) {
      for (const p of [m.teamOnePlayer1, m.teamOnePlayer2, m.teamTwoPlayer1, m.teamTwoPlayer2]) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  };

  const userParticipated = (tr: TournamentResult): boolean => {
    if (!user) return false;
    return getAllPlayers(tr).some((p) => p.name === user.name);
  };

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error && tournaments.length === 0) {
    return (
      <div className="screen center-content">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="title-row">
        <h2 className="screen-title">{t('tournaments.title')}</h2>
        <InfoTip text={t('tournaments.title_hint')} />
      </div>

      {tournaments.length === 0 && <p className="subtitle">{t('tournaments.noTournaments')}</p>}
      <div className="tournament-list">
        {tournaments.map((tr) => (
          <div
            key={tr.id}
            className={`tournament-card ${userParticipated(tr) ? 'highlight-card' : ''}`}
          >
            <div className="tournament-card-header" onClick={() => toggleExpand(tr.id)}>
              <div className="tournament-card-info">
                <span className="tournament-date">
                  {new Date(tr.date).toLocaleDateString(dateFmt)}
                </span>
                <span className="tournament-players">
                  {getAllPlayers(tr).length} {t('tournaments.players')}
                </span>
              </div>
              <div className="tournament-tags">
                <span className="tag tag-muted">{tr.matches.length} {t('tournaments.matches')}</span>
                {tr.isCancelled
                  ? <span className="tag tag-red">{t('tournaments.cancelled')}</span>
                  : tr.isEarlyFinished
                    ? <span className="tag tag-gold">{t('tournaments.earlyFinished')}</span>
                    : tr.isFinished
                      ? <span className="tag tag-green">{t('tournaments.finished')}</span>
                      : <span className="tag tag-red">{t('tournaments.notFinished')}</span>
                }
                {tr.seasonId != null
                  ? <span className="tag tag-gold">{t('tournaments.seasonal')}</span>
                  : <span className="tag tag-blue">{t('tournaments.friendly')}</span>
                }
              </div>
            </div>
            {expanded.has(tr.id) && (
              <div className="tournament-card-body">
                <div className="tournament-matches">
                  {tr.matches.map((m) => (
                    <MatchRow key={m.id} match={m} onPlayerClick={(login) => navigate(`/profile/${login}`)} />
                  ))}
                </div>
                {tr.results.length > 0 && (
                  <table className="results-table">
                    <thead>
                      <tr><th>#</th><th>{t('tournaments.player')}</th><th>{t('tournaments.points')}</th></tr>
                    </thead>
                    <tbody>
                      {tr.results.map((r, i) => (
                        <tr key={r.player.id}>
                          <td>{i + 1}</td>
                          <td>
                            <span
                              className="clickable-player"
                              onClick={() => navigate(`/profile/${r.player.login}`)}
                            >
                              {r.player.name}
                            </span>
                          </td>
                          <td className="points-cell">{r.score.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchRow({ match, onPlayerClick }: { match: MatchResult; onPlayerClick: (login: string) => void }) {
  const PlayerName = ({ player, reverse }: { player: PlayerResult; reverse?: boolean }) => (
    <span className="clickable-player" onClick={() => onPlayerClick(player.login)}>
      {!reverse && (
        <span className="avatar avatar-xs">
          {player.imageUrl ? <img src={player.imageUrl} alt="" /> : <span>{player.name[0]}</span>}
        </span>
      )}
      {player.name}
      {reverse && (
        <span className="avatar avatar-xs">
          {player.imageUrl ? <img src={player.imageUrl} alt="" /> : <span>{player.name[0]}</span>}
        </span>
      )}
    </span>
  );

  return (
    <div className="tournament-match">
      <div className="tournament-match-team">
        <PlayerName player={match.teamOnePlayer1} />
        <PlayerName player={match.teamOnePlayer2} />
      </div>
      <div className="tournament-match-score">
        {match.teamOneScore} : {match.teamTwoScore}
      </div>
      <div className="tournament-match-team tournament-match-team-right">
        <PlayerName player={match.teamTwoPlayer1} reverse />
        <PlayerName player={match.teamTwoPlayer2} reverse />
      </div>
    </div>
  );
}
