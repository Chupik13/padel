import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SeasonResult } from '../types/api';
import { getSeasons, createSuperGame } from '../api/seasons';
import { useAuth } from '../context/AuthContext';
import { generateFixedSchedule } from '../utils/scheduler';

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const carouselRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    getSeasons()
      .then((data) => {
        // Sort: newest (by start date) on the left, oldest on the right
        const sorted = [...data].sort((a, b) => {
          return new Date(b.seasonStart).getTime() - new Date(a.seasonStart).getTime();
        });
        setSeasons(sorted);
      })
      .catch(() => setError('Не удалось загрузить сезоны'))
      .finally(() => setLoading(false));
  }, []);

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
      setError('Не удалось создать супер-игру');
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
      <h2 className="screen-title">Сезоны</h2>
      {seasons.length === 0 && <p className="subtitle">Пока нет сезонов</p>}
      <div className="season-carousel" ref={carouselRef}>
        {seasons.map((season) => (
          <div key={season.id} className={`season-card ${season.isCurrent ? 'season-card-current' : ''}`}>
            <div className="season-card-header">
              <span className="season-dates">
                {new Date(season.seasonStart).toLocaleDateString('ru-RU')} —{' '}
                {new Date(season.seasonEnd).toLocaleDateString('ru-RU')}
              </span>
              {season.isCurrent && <span className="season-badge">Текущий</span>}
            </div>
            <div className="season-card-meta">
              <span>Игр для зачёта: {season.requireGamesCount}</span>
            </div>
            {season.superGame?.isFinished && (
              <div className="super-game-podium">
                <div className="super-game-title">Супер-игра</div>
                {season.superGame.podium.map((p, i) => {
                  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
                  return (
                    <div key={p.player.id} className={`podium-place podium-place-${i + 1}`}>
                      <span className="podium-medal">{medals[i]}</span>
                      <span className="podium-name">{p.player.name}</span>
                      <span className="podium-score">{p.score.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {season.superGame && !season.superGame.isFinished && (
              <span className="super-game-badge">Супер-игра идёт...</span>
            )}
            {canStartSuperGame(season) && (
              <button className="btn super-game-btn" onClick={() => handleStartSuperGame(season)}>
                Супер-игра
              </button>
            )}
            {season.leaderBoard.players.length > 0 && (
              <table className="results-table season-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Игрок</th>
                    <th>Очки</th>
                    <th>Ср.</th>
                    <th>Игр</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const seasonEnded = !season.isCurrent && new Date(season.seasonEnd) <= new Date();
                    const awaitingSuperGame = seasonEnded && !season.superGame;
                    const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
                    const superGameMedals = new Map<number, string>();
                    if (season.superGame?.isFinished) {
                      season.superGame.podium.forEach((p, i) => {
                        if (i < 3) superGameMedals.set(p.player.id, medals[i]);
                      });
                    }
                    return season.leaderBoard.players.map((p, i) => (
                      <tr key={p.player.id} className={awaitingSuperGame && i < 4 ? 'super-game-candidate-row' : ''}>
                        <td>{i + 1}</td>
                        <td>
                          <span
                            className="clickable-player"
                            onClick={() => navigate(`/profile/${p.player.login}`)}
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
                              <span className="player-medal">{superGameMedals.get(p.player.id)}</span>
                            )}
                          </span>
                        </td>
                        <td className="points-cell">{p.score.toFixed(1)}</td>
                        <td>{p.mediumScoreByTournaments.toFixed(1)}</td>
                        <td>{p.tournamentsPlayed} / {season.requireGamesCount}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
