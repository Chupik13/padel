import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SeasonResult } from '../types/api';
import { getSeasons, createSuperGame } from '../api/seasons';
import { useAuth } from '../context/AuthContext';
import ScoreChart from '../components/ScoreChart';
import { generateFixedSchedule } from '../utils/scheduler';
import GuideModal from '../components/GuideModal';
import { useGuide } from '../hooks/useGuide';

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<{ seasonId: number; playerId: number } | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dateFmt = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const { showGuide, dismissGuide } = useGuide('seasons');

  useEffect(() => {
    getSeasons()
      .then((data) => {
        // Sort: newest (by start date) on the left, oldest on the right
        const sorted = [...data].sort((a, b) => {
          return new Date(b.seasonStart).getTime() - new Date(a.seasonStart).getTime();
        });
        setSeasons(sorted);
      })
      .catch(() => setError(t('seasons.loadError')))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to current season after load
  useEffect(() => {
    if (!carouselRef.current || seasons.length === 0) return;
    const currentIdx = seasons.findIndex((s) => s.isCurrent);
    if (currentIdx >= 0) {
      const cards = carouselRef.current.children;
      if (cards[currentIdx]) {
        (cards[currentIdx] as HTMLElement).scrollIntoView({ inline: 'center', behavior: 'smooth' });
      }
    }
  }, [seasons]);

  const canStartSuperGame = (season: SeasonResult): boolean => {
    if (season.isCurrent || new Date(season.seasonEnd) > new Date()) return false;
    if (season.superGame) return false;
    if (!user) return false;
    const top4Ids = season.leaderBoard.players.slice(0, 4).map((p) => p.player.id);
    return top4Ids.includes(user.id);
  };

  const handleStartSuperGame = async (season: SeasonResult) => {
    try {
      const top4Ids = season.leaderBoard.players.slice(0, 4).map((p) => p.player.id);
      const matches = generateFixedSchedule(top4Ids, 9);
      await createSuperGame(season.id, {
        matches: matches.map((m) => ({
          teamOne: { firstPlayerId: m.team1[0], secondPlayerId: m.team1[1] },
          teamTwo: { firstPlayerId: m.team2[0], secondPlayerId: m.team2[1] },
        })),
      });
      navigate('/play');
    } catch {
      setError(t('seasons.superGameError'));
    }
  };

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen center-content">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="title-row">
      </div>
      {seasons.length === 0 && <p className="subtitle">{t('seasons.noSeasons')}</p>}
      <div className="season-carousel" ref={carouselRef}>
        {seasons.map((season, idx) => {
          const seasonNumber = seasons.length - idx;
          const now = new Date();
          const notStarted = new Date(season.seasonStart) > now;

          if (notStarted) {
            return (
              <div key={season.id} className="season-card season-card-placeholder">
                <div className="season-placeholder-label season-placeholder-future">
                  <span className="season-placeholder-title">{t('seasons.seasonNumber', { number: seasonNumber })}</span>
                  <span className="season-placeholder-dates">
                    {t('seasons.startsOn', { date: new Date(season.seasonStart).toLocaleDateString(dateFmt, { day: 'numeric', month: 'long' }) })}
                  </span>
                </div>
              </div>
            );
          }

          return (
          <div key={season.id} className={`season-card ${season.isCurrent ? 'season-card-current' : ''}`}>
            <div className="season-card-header">
              <div className="season-header-stack">
                <span className={`season-badge ${season.isCurrent ? 'season-badge-current' : 'season-badge-finished'}`}>{t('seasons.seasonNumber', { number: seasonNumber })}</span>
              </div>
              {season.isCurrent && (() => {
                const daysLeft = Math.max(0, Math.ceil((new Date(season.seasonEnd).getTime() - Date.now()) / 86400000));
                return (
                  <div className="season-days-left">
                    <span className="season-days-left-number">{daysLeft}</span>
                    <span className="season-days-left-label">{t('seasons.daysRemaining')}</span>
                  </div>
                );
              })()}
            </div>
            {season.superGame?.isFinished && (
              <div className="super-game-podium">
                <div className="super-game-title">{t('seasons.superGame')}</div>
                {season.superGame.podium.map((p, i) => {
                  const medalSvgs = ['/badges/gold-medal.svg', '/badges/silver-medal.svg', '/badges/bronze-medal.svg'];
                  return (
                    <div key={p.player.id} className={`podium-place podium-place-${i + 1}`}>
                      <span className="podium-medal"><img src={medalSvgs[i]} alt="" className="badge-icon" /></span>
                      <span className="podium-name">{p.player.name}</span>
                      <span className="podium-score">{p.score.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {season.superGame && !season.superGame.isFinished && (
              <span className="super-game-badge">{t('seasons.superGameInProgress')}</span>
            )}
            {canStartSuperGame(season) && (
              <button className="btn super-game-btn" onClick={() => handleStartSuperGame(season)}>
                {t('seasons.superGame')}
              </button>
            )}
            {season.leaderBoard.players.length > 0 && (
              <table className="results-table season-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('seasons.player')}</th>
                    <th>{t('seasons.points')}</th>
                    <th>{t('seasons.avg')}</th>
                    <th>{t('seasons.games')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const seasonEnded = !season.isCurrent && new Date(season.seasonEnd) <= new Date();
                    const awaitingSuperGame = seasonEnded && !season.superGame;
                    const medalSvgs = ['/badges/gold-medal.svg', '/badges/silver-medal.svg', '/badges/bronze-medal.svg'];
                    const superGameMedals = new Map<number, string>();
                    if (season.superGame?.isFinished) {
                      season.superGame.podium.forEach((p, i) => {
                        if (i < 3) superGameMedals.set(p.player.id, medalSvgs[i]);
                      });
                    }
                    const skipTop3 = season.superGame?.isFinished ? 3 : 0;
                    return season.leaderBoard.players.slice(skipTop3).map((p, i) => {
                      const rank = i + skipTop3 + 1;
                      const isSelected = selectedPlayer?.seasonId === season.id && selectedPlayer?.playerId === p.player.id;
                      return (
                        <tr
                          key={p.player.id}
                          className={`${awaitingSuperGame && rank <= 4 ? 'super-game-candidate-row' : ''} ${isSelected ? 'selected-player-row' : ''}`}
                          onClick={() => setSelectedPlayer(isSelected ? null : { seasonId: season.id, playerId: p.player.id })}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>{rank}</td>
                          <td>
                            <span
                              className="clickable-player"
                              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${p.player.login}`); }}
                            >
                              <span className="avatar avatar-xs">
                                {p.player.imageUrl ? (
                                  <img src={p.player.imageUrl} alt="" />
                                ) : (
                                  <span>{p.player.name[0]}</span>
                                )}
                              </span>
                              {p.player.name}
                              {superGameMedals.has(p.player.id) && (
                                <span className="player-medal"><img src={superGameMedals.get(p.player.id)} alt="" className="badge-icon" /></span>
                              )}
                            </span>
                          </td>
                          <td className="points-cell">{p.score.toFixed(1)}</td>
                          <td>{p.mediumScoreByTournaments.toFixed(1)}</td>
                          <td>{p.tournamentsPlayed} / {season.requireGamesCount}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            )}
            {selectedPlayer?.seasonId === season.id && (() => {
              const p = season.leaderBoard.players.find((pl) => pl.player.id === selectedPlayer.playerId);
              if (!p || !p.tournamentScores || p.tournamentScores.length === 0) return null;
              return <ScoreChart scores={p.tournamentScores} playerName={p.player.name} />;
            })()}
            {season.leaderBoard.players.length > 0 && !selectedPlayer && (
              <div className="season-chart-hint">{t('seasons.tapToSeeChart')}</div>
            )}
          </div>
          );
        })}
      </div>
      {showGuide && <GuideModal page="seasons" onClose={dismissGuide} />}
    </div>
  );
}
