import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { ProfileResult, TournamentResult, SeasonStatisticResult } from '../types/api';
import { getProfile, getProfileByLogin, uploadAvatar } from '../api/profile';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { login } = useParams<{ login?: string }>();
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const auth = useAuth();
  const isOwn = !login;

  useEffect(() => {
    setLoading(true);
    const fetcher = login ? getProfileByLogin(login) : getProfile();
    fetcher
      .then(setProfile)
      .catch(() => setError('Не удалось загрузить профиль'))
      .finally(() => setLoading(false));
  }, [login]);

  const handleAvatarClick = () => {
    if (isOwn) fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar(file);
      await auth.refreshMiniProfile();
      // Reload profile
      const updated = await getProfile();
      setProfile(updated);
    } catch {
      setError('Не удалось загрузить аватар');
    }
  };

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="screen center-content">
        <p className="error">{error || 'Профиль не найден'}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="profile-header">
        <div className={`avatar avatar-xl ${isOwn ? 'avatar-editable' : ''}`} onClick={handleAvatarClick}>
          {profile.imageUrl ? (
            <img src={profile.imageUrl} alt={profile.name} />
          ) : (
            <span>{profile.name[0].toUpperCase()}</span>
          )}
          {isOwn && <div className="avatar-edit-overlay">Изменить</div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <h2 className="profile-name">{profile.name}</h2>
      </div>

      {profile.currentSeason && (
        <div className="stats-card">
          <h3 className="stats-card-title">Текущий сезон</h3>
          <SeasonStats stats={profile.currentSeason} />
        </div>
      )}

      {profile.playerTournaments.length > 0 && (
        <OverallStats tournaments={profile.playerTournaments} playerId={profile.id} />
      )}

      <Awards seasons={profile.previousSeasons} />

      {profile.previousSeasons.length > 0 && (
        <div className="previous-seasons">
          <h3 className="screen-title">Прошлые сезоны</h3>
          {profile.previousSeasons.map((season, i) => (
            <details key={i} className="spoiler">
              <summary className="spoiler-summary">Сезон {profile.previousSeasons.length - i}</summary>
              <div className="spoiler-content">
                <SeasonStats stats={season} />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function Awards({ seasons }: { seasons: SeasonStatisticResult[] }) {
  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
  const labels = ['1-е место', '2-е место', '3-е место'];
  const awards = seasons
    .map((s, i) => ({ seasonNum: seasons.length - i, place: s.superGamePlace }))
    .filter((a) => a.place !== null && a.place !== undefined && a.place >= 1 && a.place <= 3);

  if (awards.length === 0) return null;

  return (
    <div className="stats-card">
      <h3 className="stats-card-title">Награды</h3>
      <div className="awards-list">
        {awards.map((a) => (
          <div key={a.seasonNum} className="award-item">
            <span className="award-medal">{medals[a.place! - 1]}</span>
            <span className="award-text">Сезон {a.seasonNum} — {labels[a.place! - 1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverallStats({ tournaments, playerId }: { tournaments: TournamentResult[]; playerId: number }) {
  let totalPoints = 0;
  let totalMatches = 0;

  for (const t of tournaments) {
    for (const m of t.matches) {
      const inTeamOne =
        m.teamOnePlayer1.id === playerId || m.teamOnePlayer2.id === playerId;
      const inTeamTwo =
        m.teamTwoPlayer1.id === playerId || m.teamTwoPlayer2.id === playerId;
      if (inTeamOne) {
        totalPoints += m.teamOneScore;
        totalMatches++;
      } else if (inTeamTwo) {
        totalPoints += m.teamTwoScore;
        totalMatches++;
      }
    }
  }

  const avg = totalMatches > 0 ? totalPoints / totalMatches : 0;

  return (
    <div className="stats-card">
      <h3 className="stats-card-title">Общая статистика</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{tournaments.length}</span>
          <span className="stat-label">Игр</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalPoints}</span>
          <span className="stat-label">Очки</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{avg.toFixed(1)}</span>
          <span className="stat-label">Ср. очки</span>
        </div>
      </div>
    </div>
  );
}

function SeasonStats({ stats }: { stats: import('../types/api').SeasonStatisticResult }) {
  return (
    <div className="stats-grid">
      <div className="stat-item">
        <span className="stat-value">{stats.score.toFixed(1)}</span>
        <span className="stat-label">Очки</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.mediumScoreAllTournaments.toFixed(1)}</span>
        <span className="stat-label">Ср. очки</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.tournamentsPlayed} / {stats.tournamentsRequired}</span>
        <span className="stat-label">Турниров</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">#{stats.ratingPlace}</span>
        <span className="stat-label">Место</span>
      </div>
    </div>
  );
}
