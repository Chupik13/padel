import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ProfileResult, TournamentResult, SeasonStatisticResult, PlayerBadgeResult } from '../types/api';
import { getProfile, getProfileByLogin, uploadAvatar } from '../api/profile';
import { useAuth } from '../context/AuthContext';
import PartnerStats from '../components/PartnerStats';
import HeadToHead from '../components/HeadToHead';
import GuideModal from '../components/GuideModal';
import { useGuide } from '../hooks/useGuide';

export default function ProfilePage() {
  const { login } = useParams<{ login?: string }>();
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const auth = useAuth();
  const navigate = useNavigate();
  const isOwn = !login;
  const { t } = useTranslation();
  const { showGuide, dismissGuide } = useGuide('profile');

  useEffect(() => {
    setLoading(true);
    const fetcher = login ? getProfileByLogin(login) : getProfile();
    fetcher
      .then(setProfile)
      .catch(() => setError(t('profile.loadError')))
      .finally(() => setLoading(false));
  }, [login]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setError(t('profile.avatarError'));
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
        <p className="error">{error || t('profile.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      {!isOwn && (
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← {t('common.back')}
        </button>
      )}
      <div className="profile-header">
        <div className={`avatar-wrapper${profile.isAdmin ? ' admin' : ''}`}>
          <div className={`avatar avatar-xl ${isOwn ? 'avatar-editable' : ''}`} onClick={handleAvatarClick}>
            {profile.imageUrl ? (
              <img src={profile.imageUrl} alt={profile.name} />
            ) : (
              <span>{profile.name[0].toUpperCase()}</span>
            )}
            {isOwn && <div className="avatar-edit-overlay">{t('profile.edit')}</div>}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <h2 className="profile-name">{profile.name}</h2>
      </div>

      {!isOwn && login && <HeadToHead targetLogin={login} />}

      {profile.currentSeason && (
        <div className="stats-card">
          <h3 className="stats-card-title">{t('profile.currentSeason')}</h3>
          <SeasonStats stats={profile.currentSeason} />
          <details className="partners-collapse">
            <summary className="partners-collapse-summary">{t('profile.bestPartners')}</summary>
            <div className="partners-collapse-content">
              <PartnerStats
                tournaments={profile.playerTournaments.filter((tr) => tr.seasonId === profile.currentSeason!.seasonId)}
                playerId={profile.id}
              />
            </div>
          </details>
        </div>
      )}

      {profile.playerTournaments.length > 0 && (
        <OverallStats tournaments={profile.playerTournaments} playerId={profile.id} />
      )}

      <Awards seasons={profile.previousSeasons} badges={profile.badges} />

      {profile.previousSeasons.length > 0 && (
        <div className="previous-seasons">
          <h3 className="screen-title">{t('profile.previousSeasons')}</h3>
          {profile.previousSeasons.map((season, i) => (
            <details key={i} className="spoiler">
              <summary className="spoiler-summary">{t('profile.season', { number: profile.previousSeasons.length - i })}</summary>
              <div className="spoiler-content">
                <SeasonStats stats={season} />
                <details className="partners-collapse">
                  <summary className="partners-collapse-summary">{t('profile.bestPartners')}</summary>
                  <div className="partners-collapse-content">
                    <PartnerStats
                      tournaments={profile.playerTournaments.filter((tr) => tr.seasonId === season.seasonId)}
                      playerId={profile.id}
                    />
                  </div>
                </details>
              </div>
            </details>
          ))}
        </div>
      )}
      {isOwn && showGuide && <GuideModal page="profile" onClose={dismissGuide} />}
    </div>
  );
}

function Awards({ seasons, badges }: { seasons: SeasonStatisticResult[]; badges: PlayerBadgeResult[] }) {
  const { t, i18n } = useTranslation();
  const medalSvgs = ['/badges/gold-medal.svg', '/badges/silver-medal.svg', '/badges/bronze-medal.svg'];
  const labels = [t('profile.place1'), t('profile.place2'), t('profile.place3')];
  const awards = seasons
    .map((s, i) => ({ seasonNum: seasons.length - i, place: s.superGamePlace }))
    .filter((a) => a.place !== null && a.place !== undefined && a.place >= 1 && a.place <= 3);

  if (awards.length === 0 && badges.length === 0) return null;

  return (
    <div className="stats-card">
      <h3 className="stats-card-title">{t('profile.awards')}</h3>
      <div className="awards-list">
        {badges.map((b) => (
          <div key={`badge-${b.id}`} className="award-item">
            <span className="award-medal">
              {b.badgeEmoji.startsWith('/') ? <img src={b.badgeEmoji} alt="" className="badge-icon" /> : b.badgeEmoji}
            </span>
            <span className="award-text">
              {i18n.language === 'ru' ? b.badgeNameRu : b.badgeNameEn}
              {b.note && ` — ${b.note}`}
            </span>
          </div>
        ))}
        {awards.map((a) => (
          <div key={a.seasonNum} className="award-item">
            <span className="award-medal"><img src={medalSvgs[a.place! - 1]} alt="" className="badge-icon" /></span>
            <span className="award-text">{t('profile.awardText', { season: a.seasonNum, place: labels[a.place! - 1] })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverallStats({ tournaments, playerId }: { tournaments: TournamentResult[]; playerId: number }) {
  const { t } = useTranslation();
  let totalPoints = 0;
  let totalMatches = 0;

  for (const tr of tournaments) {
    for (const m of tr.matches) {
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
      <h3 className="stats-card-title">{t('profile.overallStats')}</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{tournaments.length}</span>
          <span className="stat-label">{t('profile.games')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalPoints}</span>
          <span className="stat-label">{t('profile.points')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{avg.toFixed(1)}</span>
          <span className="stat-label">{t('profile.avgPoints')}</span>
        </div>
      </div>
      <details className="partners-collapse">
        <summary className="partners-collapse-summary">{t('profile.bestPartners')}</summary>
        <div className="partners-collapse-content">
          <PartnerStats tournaments={tournaments} playerId={playerId} />
        </div>
      </details>
    </div>
  );
}

function SeasonStats({ stats }: { stats: import('../types/api').SeasonStatisticResult }) {
  const { t } = useTranslation();
  return (
    <div className="stats-grid">
      <div className="stat-item">
        <span className="stat-value">{stats.score.toFixed(1)}</span>
        <span className="stat-label">{t('profile.points')}</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.mediumScoreAllTournaments.toFixed(1)}</span>
        <span className="stat-label">{t('profile.avgPoints')}</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.tournamentsPlayed} / {stats.tournamentsRequired}</span>
        <span className="stat-label">{t('profile.tournaments')}</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.tournamentsPlayed > 0 ? `#${stats.ratingPlace}` : '—'}</span>
        <span className="stat-label">{t('profile.place')}</span>
      </div>
    </div>
  );
}
