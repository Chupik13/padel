import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TournamentResult, MatchResult, PlayerResult, GlobalPlayerStats } from '../types/api';
import { getTournaments } from '../api/tournaments';
import { getGlobalLeaderboard } from '../api/players';
import { useAuth } from '../context/AuthContext';

type Tab = 'history' | 'leaderboard';

export default function TournamentsPage() {
  const [tab, setTab] = useState<Tab>('history');
  const [tournaments, setTournaments] = useState<TournamentResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<GlobalPlayerStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    getTournaments()
      .then((data) => {
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTournaments(sorted);
      })
      .catch(() => setError('Не удалось загрузить турниры'))
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    if (newTab === 'leaderboard' && leaderboard === null) {
      setLeaderboardLoading(true);
      getGlobalLeaderboard()
        .then((data) => setLeaderboard(data.players))
        .catch(() => setError('Не удалось загрузить рейтинг'))
        .finally(() => setLeaderboardLoading(false));
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getAllPlayers = (t: TournamentResult): PlayerResult[] => {
    const map = new Map<number, PlayerResult>();
    for (const m of t.matches) {
      for (const p of [m.teamOnePlayer1, m.teamOnePlayer2, m.teamTwoPlayer1, m.teamTwoPlayer2]) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  };

  const userParticipated = (t: TournamentResult): boolean => {
    if (!user) return false;
    return getAllPlayers(t).some((p) => p.name === user.name);
  };

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error && tab === 'history' && tournaments.length === 0) {
    return (
      <div className="screen center-content">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2 className="screen-title">Турниры</h2>

      <div className="tabs">
        <button
          className={`tab ${tab === 'history' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          История турниров
        </button>
        <button
          className={`tab ${tab === 'leaderboard' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('leaderboard')}
        >
          Общий рейтинг
        </button>
      </div>

      {tab === 'history' && (
        <>
          {tournaments.length === 0 && <p className="subtitle">Пока нет турниров</p>}
          <div className="tournament-list">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className={`tournament-card ${userParticipated(t) ? 'highlight-card' : ''}`}
              >
                <div className="tournament-card-header" onClick={() => toggleExpand(t.id)}>
                  <div className="tournament-card-info">
                    <span className="tournament-date">
                      {new Date(t.date).toLocaleDateString('ru-RU')}
                    </span>
                    <span className="tournament-players">
                      {getAllPlayers(t).length} игроков
                    </span>
                  </div>
                  <div className="tournament-badges">
                    {t.isBalanced && t.seasonId == null && <span className="star-blue" title="Баланс">&#9733;</span>}
                    {t.seasonId != null && <span className="star-gold" title="Сезонная">&#9733;</span>}
                  </div>
                </div>
                {expanded.has(t.id) && (
                  <div className="tournament-card-body">
                    <div className="tournament-matches">
                      {t.matches.map((m) => (
                        <MatchRow key={m.id} match={m} onPlayerClick={(login) => navigate(`/profile/${login}`)} />
                      ))}
                    </div>
                    {t.results.length > 0 && (
                      <table className="results-table">
                        <thead>
                          <tr><th>#</th><th>Игрок</th><th>Очки</th></tr>
                        </thead>
                        <tbody>
                          {t.results.map((r, i) => (
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
        </>
      )}

      {tab === 'leaderboard' && (
        <>
          {leaderboardLoading && (
            <div className="center-content" style={{ padding: '40px 0' }}>
              <div className="loading-spinner" />
            </div>
          )}
          {error && !leaderboardLoading && <p className="error">{error}</p>}
          {leaderboard && !leaderboardLoading && (
            <div className="leaderboard-table-wrapper">
              <table className="results-table leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Игрок</th>
                    <th>Игр</th>
                    <th>Очки</th>
                    <th>Ср.</th>
                    <th>С.игр</th>
                    <th>С.очки</th>
                    <th>С.ср.</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((s, i) => (
                    <tr key={s.player.id} className={i === 0 ? 'first-place' : ''}>
                      <td>{i + 1}</td>
                      <td>
                        <span
                          className="clickable-player"
                          onClick={() => navigate(`/profile/${s.player.login}`)}
                        >
                          <span className="avatar avatar-xs">
                            {s.player.imageUrl ? <img src={s.player.imageUrl} alt="" /> : <span>{s.player.name[0]}</span>}
                          </span>
                          {s.player.name}
                        </span>
                      </td>
                      <td>{s.totalGames}</td>
                      <td className="points-cell">{s.totalPoints.toFixed(1)}</td>
                      <td>{s.averagePointsPerGame.toFixed(1)}</td>
                      <td>{s.seasonGames}</td>
                      <td>{s.seasonTotalPoints.toFixed(1)}</td>
                      <td>{s.seasonAveragePoints.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {leaderboard && leaderboard.length === 0 && !leaderboardLoading && (
            <p className="subtitle">Пока нет данных для рейтинга</p>
          )}
        </>
      )}
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
