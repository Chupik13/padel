import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TournamentResult, MatchResult, PlayerResult } from '../types/api';
import { getTournaments, deleteTournamentPermanent } from '../api/tournaments';
import { useAuth } from '../context/AuthContext';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showCancelled, setShowCancelled] = useState(false);
  const [showSeasonal, setShowSeasonal] = useState(true);
  const [showFriendly, setShowFriendly] = useState(true);
  const [showEarlyFinished, setShowEarlyFinished] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user, miniProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const dateFmt = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  const ADMIN_LOGIN = 't224215';
  const isAdmin = user?.login === ADMIN_LOGIN;

  const handleDelete = async (id: number) => {
    try {
      await deleteTournamentPermanent(id);
      setTournaments((prev) => prev.filter((t) => t.id !== id));
      setDeleteConfirm(null);
    } catch {
      setError(t('tournaments.loadError'));
    }
  };

  const loadTournaments = useCallback(() => {
    setLoading(true);
    getTournaments(true)
      .then((data) => {
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTournaments(sorted);
      })
      .catch(() => setError(t('tournaments.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const filteredTournaments = tournaments.filter((tr) => {
    if (!showCancelled && tr.isCancelled) return false;
    if (!showSeasonal && tr.seasonId != null) return false;
    if (!showFriendly && tr.seasonId == null) return false;
    if (!showEarlyFinished && tr.isEarlyFinished) return false;
    return true;
  });

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
      {deleteConfirm !== null && (
        <div className="modal-overlay">
          <div className="modal">
            <p>{t('tournaments.deleteConfirm')}</p>
            <div className="button-row">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                {t('tournaments.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="screen-title">{t('tournaments.title')}</h2>

      <div className="filter-chips">
        <button className={`filter-chip ${showSeasonal ? 'active' : ''}`} onClick={() => setShowSeasonal(!showSeasonal)}>
          {t('tournaments.seasonal')}
        </button>
        <button className={`filter-chip ${showFriendly ? 'active' : ''}`} onClick={() => setShowFriendly(!showFriendly)}>
          {t('tournaments.friendly')}
        </button>
        <button className={`filter-chip ${showEarlyFinished ? 'active' : ''}`} onClick={() => setShowEarlyFinished(!showEarlyFinished)}>
          {t('tournaments.earlyFinished')}
        </button>
        <button className={`filter-chip ${showCancelled ? 'active' : ''}`} onClick={() => setShowCancelled(!showCancelled)}>
          {t('tournaments.cancelled')}
        </button>
      </div>
      {filteredTournaments.length === 0 && <p className="subtitle">{t('tournaments.noTournaments')}</p>}
      <div className="tournament-list">
        {filteredTournaments.map((tr) => (
          <div
            key={tr.id}
            className={`tournament-card ${userParticipated(tr) ? 'highlight-card' : ''}`}
          >
            <div className="tournament-card-header" onClick={() => toggleExpand(tr.id)}>
              <div className="tournament-card-info">
                <span className="tournament-date">
                  {new Date(tr.date).toLocaleDateString(dateFmt)}
                  {tr.clubName && (
                    <span className="tournament-club-name">{tr.clubName}</span>
                  )}
                </span>
                <span className="tournament-players">
                  {getAllPlayers(tr).length} {t('tournaments.players')}
                  {tr.finishedAt ? (() => {
                    const totalSec = Math.round((new Date(tr.finishedAt).getTime() - new Date(tr.date).getTime()) / 1000);
                    if (totalSec <= 0) return null;
                    const h = Math.floor(totalSec / 3600);
                    const m = Math.floor((totalSec % 3600) / 60);
                    const s = totalSec % 60;
                    const time = h > 0
                      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                      : `${m}:${s.toString().padStart(2, '0')}`;
                    return <span className="tournament-duration">{time}</span>;
                  })()
                  : !tr.isFinished && !tr.isCancelled && <LiveTournamentDuration startDate={tr.date} />}
                </span>
              </div>
              <div className="tournament-tags">
                {isAdmin && (
                  <button
                    className="tag tag-red"
                    style={{ cursor: 'pointer', border: 'none' }}
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(tr.id); }}
                    title="Delete"
                  >🗑</button>
                )}
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
                  {tr.matches.map((m, idx) => {
                    let duration: string | undefined;
                    let live = false;
                    if (m.startedAt) {
                      const start = new Date(m.startedAt).getTime();
                      const nextStart = tr.matches[idx + 1]?.startedAt
                        ? new Date(tr.matches[idx + 1].startedAt!).getTime()
                        : tr.finishedAt ? new Date(tr.finishedAt).getTime() : null;
                      if (nextStart) {
                        const totalSec = Math.round((nextStart - start) / 1000);
                        if (totalSec > 0) {
                          const mins = Math.floor(totalSec / 60);
                          const secs = totalSec % 60;
                          duration = `${mins}:${secs.toString().padStart(2, '0')}`;
                        }
                      } else {
                        live = true;
                      }
                    }
                    return <MatchRow key={m.id} match={m} hostPlayerId={tr.hostPlayerId} duration={duration} liveStartedAt={live ? m.startedAt : undefined} onPlayerClick={(login) => navigate(`/profile/${login}`)} />;
                  })}
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
                              {r.player.id === tr.hostPlayerId && <span className="host-badge" />}
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

function LiveTournamentDuration({ startDate }: { startDate: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const ms = Date.now() - new Date(startDate).getTime();
      const totalSec = Math.round(ms / 1000);
      if (totalSec <= 0) return;
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setElapsed(h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startDate]);

  if (!elapsed) return null;
  return <span className="tournament-duration">{elapsed}</span>;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec <= 0) return '0:00';
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function MatchRow({ match, hostPlayerId, duration, liveStartedAt, onPlayerClick }: { match: MatchResult; hostPlayerId: number | null; duration?: string; liveStartedAt?: string; onPlayerClick: (login: string) => void }) {
  const [liveElapsed, setLiveElapsed] = useState('');

  const updateElapsed = useCallback(() => {
    if (!liveStartedAt) return;
    const elapsed = Date.now() - new Date(liveStartedAt).getTime();
    setLiveElapsed(formatDuration(elapsed));
  }, [liveStartedAt]);

  useEffect(() => {
    if (!liveStartedAt) return;
    updateElapsed();
    const id = setInterval(updateElapsed, 1000);
    return () => clearInterval(id);
  }, [liveStartedAt, updateElapsed]);

  const displayDuration = duration ?? (liveElapsed || undefined);

  const PlayerName = ({ player, reverse }: { player: PlayerResult; reverse?: boolean }) => (
    <span className="clickable-player" onClick={() => onPlayerClick(player.login)}>
      {!reverse && (
        <span className="avatar avatar-xs">
          {player.imageUrl ? <img src={player.imageUrl} alt="" /> : <span>{player.name[0]}</span>}
        </span>
      )}
      {player.name}
      {player.id === hostPlayerId && <span className="host-badge" />}
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
        {displayDuration && <span className="match-duration">{displayDuration}</span>}
      </div>
      <div className="tournament-match-team tournament-match-team-right">
        <PlayerName player={match.teamTwoPlayer1} reverse />
        <PlayerName player={match.teamTwoPlayer2} reverse />
      </div>
    </div>
  );
}
