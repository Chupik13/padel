import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getClubs, getClubMembers, joinClub, createClub, leaveClub } from '../api/clubs';
import { getGlobalLeaderboard } from '../api/players';
import type { ClubResult, PlayerResult, GlobalPlayerStats } from '../types/api';
import InfoTip from '../components/InfoTip';

interface MemberRow {
  player: PlayerResult;
  totalGames: number;
  totalPoints: number;
  averagePointsPerGame: number;
  seasonGames: number;
  seasonTotalPoints: number;
  seasonAveragePoints: number;
}

export default function ClubSelectPage() {
  const { miniProfile, refreshMiniProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [clubs, setClubs] = useState<ClubResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Detail screen state — open own club by default
  const [selectedClubId, setSelectedClubId] = useState<number | null>(miniProfile?.clubId ?? null);
  const [detailMembers, setDetailMembers] = useState<MemberRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);

  const hasClub = miniProfile?.clubId != null;
  const myClubId = miniProfile?.clubId ?? null;

  // Load clubs list
  useEffect(() => {
    getClubs()
      .then(setClubs)
      .catch(() => setError(t('club.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  // Load detail screen data when a club is selected
  useEffect(() => {
    if (selectedClubId === null) {
      setDetailMembers([]);
      return;
    }
    setDetailLoading(true);
    setError('');
    Promise.all([getClubMembers(selectedClubId), getGlobalLeaderboard()])
      .then(([players, lb]) => {
        const playerIds = new Set(players.map((p) => p.id));
        const statsMap = new Map<number, GlobalPlayerStats>();
        for (const s of lb.players) {
          if (playerIds.has(s.player.id)) {
            statsMap.set(s.player.id, s);
          }
        }
        const rows: MemberRow[] = players.map((p) => {
          const s = statsMap.get(p.id);
          return {
            player: p,
            totalGames: s?.totalGames ?? 0,
            totalPoints: s?.totalPoints ?? 0,
            averagePointsPerGame: s?.averagePointsPerGame ?? 0,
            seasonGames: s?.seasonGames ?? 0,
            seasonTotalPoints: s?.seasonTotalPoints ?? 0,
            seasonAveragePoints: s?.seasonAveragePoints ?? 0,
          };
        });
        rows.sort((a, b) => b.totalPoints - a.totalPoints || b.totalGames - a.totalGames);
        setDetailMembers(rows);
      })
      .catch(() => setError(t('club.loadError')))
      .finally(() => setDetailLoading(false));
  }, [selectedClubId, t]);

  const handleJoin = async (clubId: number) => {
    setJoining(true);
    setError('');
    try {
      await joinClub(clubId);
      await refreshMiniProfile();
      navigate('/play');
    } catch {
      setError(t('club.joinError'));
    } finally {
      setJoining(false);
      setShowJoinConfirm(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createClub(newName.trim());
      await refreshMiniProfile();
      navigate('/play');
    } catch {
      setError(t('club.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    setError('');
    try {
      await leaveClub();
      await refreshMiniProfile();
      setSelectedClubId(null);
    } catch {
      setError(t('club.leaveBlocked'));
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  // --- Screen 2: Club detail ---
  if (selectedClubId !== null) {
    const selectedClub = clubs.find((c) => c.id === selectedClubId);
    const isMyClub = myClubId === selectedClubId;

    return (
      <div className="screen club-page">
        {isMyClub ? (
          clubs.length > 1 && (
            <button className="btn-back" onClick={() => { setSelectedClubId(null); setShowMenu(false); setError(''); }}>
              ← {t('club.allClubs')}
            </button>
          )
        ) : (
          <button className="btn-back" onClick={() => { setSelectedClubId(null); setShowMenu(false); setError(''); }}>
            ← {t('common.back')}
          </button>
        )}
        <div className="club-header">
          <div className="club-title-row">
            <h2 className="screen-title">{selectedClub?.name ?? '...'}</h2>
            <InfoTip text={t('club.detail_hint')} />
            {isMyClub && (
              <div className="club-menu-wrapper">
                <button className="club-menu-btn" onClick={() => setShowMenu((v) => !v)}>&#9662;</button>
                {showMenu && (
                  <>
                    <div className="club-menu-backdrop" onClick={() => setShowMenu(false)} />
                    <div className="club-menu-dropdown">
                      <button
                        className="club-menu-dropdown-item danger"
                        onClick={handleLeave}
                        disabled={leaving}
                      >
                        {leaving ? '...' : t('club.leave')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <span className="club-member-count">
            {t('club.members', { count: selectedClub?.memberCount ?? detailMembers.length })}
          </span>
        </div>

        {error && <p className="error">{error}</p>}

        {detailLoading ? (
          <div className="center-content">
            <div className="loading-spinner" />
          </div>
        ) : (
          <div className="leaderboard-table-wrapper">
            <table className="results-table leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('tournaments.player')}</th>
                  <th>{t('tournaments.gamesShort')}</th>
                  <th>{t('tournaments.points')}</th>
                  <th>{t('tournaments.avg')}</th>
                  <th>{t('tournaments.seasonAvg')}</th>
                </tr>
              </thead>
              <tbody>
                {detailMembers.map((m, i) => (
                  <tr key={m.player.id} className={i === 0 && m.totalGames > 0 ? 'first-place' : ''}>
                    <td>{i + 1}</td>
                    <td>
                      <span
                        className="clickable-player"
                        onClick={() => navigate(`/profile/${m.player.login}`)}
                      >
                        <span className="avatar avatar-xs">
                          {m.player.imageUrl ? <img src={m.player.imageUrl} alt="" /> : <span>{m.player.name[0]}</span>}
                        </span>
                        {m.player.name}
                      </span>
                    </td>
                    <td>{m.totalGames}</td>
                    <td className="points-cell">{m.totalPoints.toFixed(1)}</td>
                    <td>{m.averagePointsPerGame.toFixed(1)}</td>
                    <td>{m.seasonAveragePoints.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isMyClub && !hasClub && !detailLoading && (
          <button
            className="btn btn-primary club-join-btn"
            onClick={() => setShowJoinConfirm(true)}
            disabled={joining}
          >
            {t('club.join')}
          </button>
        )}

        {showJoinConfirm && selectedClub && (
          <>
            <div className="club-menu-backdrop" onClick={() => setShowJoinConfirm(false)} />
            <div className="confirm-modal">
              <p>{t('club.joinConfirm', { name: selectedClub.name })}</p>
              <div className="confirm-modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handleJoin(selectedClub.id)}
                  disabled={joining}
                >
                  {joining ? '...' : t('club.confirm')}
                </button>
                <button
                  className="btn"
                  onClick={() => setShowJoinConfirm(false)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- Screen 1: Club list ---
  return (
    <div className="screen club-page">
      <div className="title-row">
        <h2 className="screen-title">{t('club.allClubs')}</h2>
        <InfoTip text={t('club.allClubs_hint')} />
      </div>

      {error && <p className="error">{error}</p>}

      {clubs.length > 0 && (
        <div className="club-list">
          {clubs.map((club) => (
            <button
              key={club.id}
              className={`club-card${club.id === myClubId ? ' club-card-mine' : ''}`}
              onClick={() => setSelectedClubId(club.id)}
            >
              <span className="club-card-name">{club.name}</span>
              <span className="club-card-members">
                {t('club.members', { count: club.memberCount })}
              </span>
            </button>
          ))}
        </div>
      )}

      {!hasClub && (
        showCreate ? (
          <div className="club-create-form">
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('club.clubName')}
              maxLength={50}
            />
            <div className="club-create-actions">
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating ? '...' : t('club.create')}
              </button>
              <button
                className="btn"
                onClick={() => setShowCreate(false)}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-secondary club-create-btn"
            onClick={() => setShowCreate(true)}
          >
            {t('club.create')}
          </button>
        )
      )}
    </div>
  );
}
