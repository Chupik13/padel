import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tournament, TournamentFormat, FormatOption, Player, Match } from '../types';
import type { PlayerResult, TournamentResult } from '../types/api';
import { generateSchedule, generateFixedSchedule } from '../utils/scheduler';
import { saveTournament as saveLocal, loadTournament, clearTournament } from '../utils/storage';
import { getSeasons } from '../api/seasons';
import { createLiveTournament, getUnfinishedTournaments, getClubActiveTournaments, updateMatchScore, navigateMatch, finishTournament, earlyFinishTournament, cancelTournament } from '../api/tournaments';
import { useAuth } from '../context/AuthContext';
import { useTournamentHub } from '../hooks/useTournamentHub';
import PlayerCountSelect from '../components/PlayerCountSelect';
import FormatSelect from '../components/FormatSelect';
import PlayerSelectForm from '../components/PlayerSelectForm';
import MatchView from '../components/MatchView';
import Results from '../components/Results';
import InfoTip from '../components/InfoTip';

const ADMIN_LOGIN = 't224215';

type PlayScreen = 'loading' | 'unfinished' | 'select-count' | 'select-format' | 'select-players' | 'season-toggle' | 'match' | 'results';

function tournamentResultToLocal(result: TournamentResult): Tournament {
  const playerMap = new Map<number, Player>();
  for (const m of result.matches) {
    for (const p of [m.teamOnePlayer1, m.teamOnePlayer2, m.teamTwoPlayer1, m.teamTwoPlayer2]) {
      if (!playerMap.has(p.id)) playerMap.set(p.id, { id: p.id, name: p.name, imageUrl: p.imageUrl });
    }
  }
  const players = Array.from(playerMap.values());
  const allPlayerIds = new Set(players.map((p) => p.id));

  const matches: Match[] = result.matches.map((m) => {
    const playing = new Set([m.teamOnePlayer1.id, m.teamOnePlayer2.id, m.teamTwoPlayer1.id, m.teamTwoPlayer2.id]);
    const resting = Array.from(allPlayerIds).filter((id) => !playing.has(id));
    return {
      team1: [m.teamOnePlayer1.id, m.teamOnePlayer2.id] as [number, number],
      team2: [m.teamTwoPlayer1.id, m.teamTwoPlayer2.id] as [number, number],
      resting,
      score1: m.teamOneScore || undefined,
      score2: m.teamTwoScore || undefined,
      startedAt: m.startedAt,
    };
  });

  return {
    players,
    matches,
    currentMatchIndex: result.currentMatchIndex,
    format: result.isBalanced ? 'balanced' : undefined,
    id: result.id,
    hostPlayerId: result.hostPlayerId ?? undefined,
    isFinished: result.isFinished,
  };
}

function getPlayersFromResult(t: TournamentResult): PlayerResult[] {
  const map = new Map<number, PlayerResult>();
  for (const m of t.matches) {
    for (const p of [m.teamOnePlayer1, m.teamOnePlayer2, m.teamTwoPlayer1, m.teamTwoPlayer2]) {
      map.set(p.id, p);
    }
  }
  return Array.from(map.values());
}

export default function PlayPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = useState<PlayScreen>('loading');
  const [playerCount, setPlayerCount] = useState(4);
  const [format, setFormat] = useState<TournamentFormat>('balanced');
  const [formatOption, setFormatOption] = useState<FormatOption | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [showResume, setShowResume] = useState(false);
  const [inSeason, setInSeason] = useState(false);
  const [hasActiveSeason, setHasActiveSeason] = useState(false);
  const [apiPlayers, setApiPlayers] = useState<PlayerResult[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [hostName, setHostName] = useState<string | undefined>();
  const [unfinishedList, setUnfinishedList] = useState<TournamentResult[]>([]);
  const [clubActiveList, setClubActiveList] = useState<TournamentResult[]>([]);

  const isAdmin = user?.login === ADMIN_LOGIN;

  const { joinTournament, leaveTournament } = useTournamentHub({
    onScoreUpdated: (_tournamentId, matchIndex, teamOneScore, teamTwoScore) => {
      setTournament((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, matches: [...prev.matches] };
        updated.matches[matchIndex] = {
          ...updated.matches[matchIndex],
          score1: teamOneScore || undefined,
          score2: teamTwoScore || undefined,
        };
        return updated;
      });
    },
    onMatchNavigated: (_tournamentId, matchIndex) => {
      setTournament((prev) => {
        if (!prev) return prev;
        const matches = [...prev.matches];
        if (matches[matchIndex] && !matches[matchIndex].startedAt) {
          matches[matchIndex] = { ...matches[matchIndex], startedAt: new Date().toISOString() };
        }
        return { ...prev, matches, currentMatchIndex: matchIndex };
      });
    },
    onTournamentFinished: () => {
      setTournament((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          isFinished: true,
          matches: prev.matches.map((m) =>
            (m.score1 === undefined || (m.score1 === 0 && m.score2 === 0))
              ? { ...m, score1: 8, score2: 8 }
              : m
          ),
        };
      });
      setScreen('results');
    },
    onTournamentCancelled: () => {
      handleRestart();
    },
  });

  const loadUnfinished = useCallback(async () => {
    try {
      const list = await getUnfinishedTournaments();
      // Spectator tournament: user is participant but not host (and not admin)
      if (!isAdmin) {
        const spectator = list.find((t) => t.hostPlayerId !== user?.id);
        if (spectator && spectator.matches.length > 0) {
          enterTournament(spectator);
          return;
        }
      }
      // Host (or admin) unfinished tournaments
      const hostList = isAdmin ? list : list.filter((t) => t.hostPlayerId === user?.id);

      // Load club active tournaments (for spectator view)
      let clubActive: TournamentResult[] = [];
      try {
        const allClubActive = await getClubActiveTournaments();
        // Exclude tournaments the user is already involved in
        const myIds = new Set(list.map((t) => t.id));
        clubActive = allClubActive.filter((t) => !myIds.has(t.id));
      } catch { /* ignore */ }
      setClubActiveList(clubActive);

      if (hostList.length > 0 || clubActive.length > 0) {
        setUnfinishedList(hostList);
        setScreen('unfinished');
        return;
      }
    } catch { /* no unfinished */ }
    return null; // signal: no unfinished found
  }, [user?.id, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        getSeasons()
          .then((seasons) => setHasActiveSeason(seasons.some((s) => s.isCurrent)))
          .catch(() => {}),
      ]);

      const result = await loadUnfinished();
      if (result === null) {
        // No unfinished tournaments found
        const saved = loadTournament();
        if (saved) setShowResume(true);
        setScreen('select-count');
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enterTournament = (t: TournamentResult) => {
    const local = tournamentResultToLocal(t);
    setTournament(local);
    const currentIsHost = user?.id === t.hostPlayerId || isAdmin;
    setIsHost(currentIsHost);
    setInSeason(t.seasonId != null);

    if (!currentIsHost) {
      const hostPlayer = t.matches
        .flatMap((m) => [m.teamOnePlayer1, m.teamOnePlayer2, m.teamTwoPlayer1, m.teamTwoPlayer2])
        .find((p) => p.id === t.hostPlayerId);
      setHostName(hostPlayer?.name);
    }

    joinTournament(t.id);

    if (t.isFinished) {
      setScreen('results');
    } else {
      setScreen('match');
    }
  };

  const handleResume = () => {
    const saved = loadTournament();
    if (saved) {
      setTournament(saved);
      const allScored = saved.matches.every((m) => m.score1 !== undefined);
      setScreen(allScored ? 'results' : 'match');
    }
    setShowResume(false);
  };

  const handleDismissResume = () => {
    clearTournament();
    setShowResume(false);
  };

  const handleSelectCount = (count: number) => {
    setPlayerCount(count);
    setScreen('select-format');
  };

  const handleSelectFormat = (option: FormatOption) => {
    setFormatOption(option);
    setFormat(option.generationMode === 'balanced' ? 'balanced' : 'fixed-5');
    setScreen('select-players');
  };

  const handlePlayersSubmit = (players: PlayerResult[]) => {
    setApiPlayers(players);
    if (hasActiveSeason && formatOption?.generationMode === 'balanced') {
      setScreen('season-toggle');
    } else {
      startTournament(players, false);
    }
  };

  const startTournament = async (players: PlayerResult[], seasonal: boolean) => {
    const localPlayers: Player[] = players.map((p) => ({ id: p.id, name: p.name }));
    const ids = localPlayers.map((p) => p.id);
    const opt = formatOption;
    const matches =
      opt?.generationMode === 'balanced'
        ? generateSchedule(ids, opt.k)
        : generateFixedSchedule(ids, opt?.matchCount ?? 5);

    try {
      const result = await createLiveTournament({
        isBalanced: opt?.generationMode === 'balanced',
        inSeason: seasonal,
        matches: matches.map((m) => ({
          teamOne: { firstPlayerId: m.team1[0], secondPlayerId: m.team1[1] },
          teamTwo: { firstPlayerId: m.team2[0], secondPlayerId: m.team2[1] },
        })),
      });

      const now = new Date().toISOString();
      const tr: Tournament = {
        players: localPlayers,
        matches: matches.map((m, i) => ({ ...m, startedAt: i === 0 ? now : undefined })),
        currentMatchIndex: 0,
        format,
        id: result.id,
        hostPlayerId: result.hostPlayerId ?? undefined,
        isFinished: false,
      };
      setTournament(tr);
      setIsHost(true);
      setInSeason(seasonal);
      joinTournament(result.id);
      setScreen('match');
    } catch {
      // Fallback to local-only mode
      const now = new Date().toISOString();
      const tr: Tournament = { players: localPlayers, matches: matches.map((m, i) => ({ ...m, startedAt: i === 0 ? now : undefined })), currentMatchIndex: 0, format };
      setTournament(tr);
      saveLocal(tr);
      setInSeason(seasonal);
      setScreen('match');
    }
  };

  const handleUpdateScore = useCallback(async (matchIndex: number, score1: number | undefined, score2: number | undefined) => {
    setTournament((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, matches: [...prev.matches] };
      updated.matches[matchIndex] = { ...updated.matches[matchIndex], score1, score2 };
      if (!prev.id) saveLocal(updated);
      return updated;
    });

    // Sync to server for live tournaments
    setTournament((prev) => {
      if (prev?.id && isHost) {
        updateMatchScore(prev.id, {
          matchIndex,
          teamOneScore: score1 ?? 0,
          teamTwoScore: score2 ?? 0,
        }).catch(() => {});
      }
      return prev;
    });
  }, [isHost]);

  const handleNext = useCallback(async () => {
    setTournament((prev) => {
      if (!prev) return prev;
      const newIndex = prev.currentMatchIndex + 1;
      const matches = [...prev.matches];
      if (matches[newIndex] && !matches[newIndex].startedAt) {
        matches[newIndex] = { ...matches[newIndex], startedAt: new Date().toISOString() };
      }
      const updated = { ...prev, matches, currentMatchIndex: newIndex };
      if (!prev.id) saveLocal(updated);
      if (prev.id && isHost) {
        navigateMatch(prev.id, newIndex).catch(() => {});
      }
      return updated;
    });
  }, [isHost]);

  const handlePrev = useCallback(async () => {
    setTournament((prev) => {
      if (!prev) return prev;
      const newIndex = prev.currentMatchIndex - 1;
      const updated = { ...prev, currentMatchIndex: newIndex };
      if (!prev.id) saveLocal(updated);
      if (prev.id && isHost) {
        navigateMatch(prev.id, newIndex).catch(() => {});
      }
      return updated;
    });
  }, [isHost]);

  const handleFinish = useCallback(async () => {
    if (tournament?.id && isHost) {
      try {
        await finishTournament(tournament.id);
      } catch {
        // continue to results anyway
      }
    }
    setScreen('results');
  }, [tournament?.id, isHost]);

  const [earlyFinishError, setEarlyFinishError] = useState('');

  const handleEarlyFinish = useCallback(async () => {
    if (!tournament?.id) return;
    setEarlyFinishError('');
    try {
      await earlyFinishTournament(tournament.id);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'earlyFinishMinGames') {
        setEarlyFinishError(t('match.earlyFinishMinGames'));
        return;
      }
      // continue anyway for other errors
    }
    // Update local state: all 0:0 matches → 8:8
    setTournament((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        isFinished: true,
        matches: prev.matches.map((m) =>
          (m.score1 === undefined || (m.score1 === 0 && m.score2 === 0))
            ? { ...m, score1: 8, score2: 8 }
            : m
        ),
      };
      return updated;
    });
    setScreen('results');
  }, [tournament?.id, t]);

  const handleCancel = useCallback(async () => {
    if (tournament?.id) {
      try {
        await cancelTournament(tournament.id);
      } catch {
        // ignore
      }
    }
    handleRestart();
  }, [tournament?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRematch = useCallback(async () => {
    if (tournament?.id) {
      leaveTournament(tournament.id);
    }
    clearTournament();
    setTournament(null);
    await startTournament(apiPlayers, inSeason);
  }, [tournament?.id, apiPlayers, inSeason, formatOption, format]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestart = async () => {
    if (tournament?.id) {
      leaveTournament(tournament.id);
    }
    clearTournament();
    setTournament(null);
    setFormat('balanced');
    setFormatOption(null);
    setApiPlayers([]);
    setInSeason(false);
    setIsHost(false);
    setHostName(undefined);

    // Re-check for remaining unfinished tournaments
    try {
      const list = await getUnfinishedTournaments();
      const hostList = isAdmin ? list : list.filter((t) => t.hostPlayerId === user?.id);
      if (hostList.length > 0) {
        setUnfinishedList(hostList);
        setScreen('unfinished');
        return;
      }
    } catch { /* ignore */ }
    setScreen('select-count');
  };

  const dateFmt = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  if (screen === 'loading') {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <>
      {showResume && (
        <div className="modal-overlay">
          <div className="modal">
            <p>{t('play.resumePrompt')}</p>
            <div className="button-row">
              <button className="btn btn-secondary" onClick={handleDismissResume}>
                {t('play.resumeNo')}
              </button>
              <button className="btn btn-primary" onClick={handleResume}>
                {t('play.resumeYes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'unfinished' && (
        <div className="screen">
          <div className="title-row">
            <h2 className="screen-title">{t('play.unfinished')}</h2>
            <InfoTip text={t('play.unfinished_hint')} />
          </div>
          <div className="tournament-list">
            {unfinishedList.map((tr) => {
              const players = getPlayersFromResult(tr);
              const played = tr.matches.filter((m) => m.teamOneScore > 0 || m.teamTwoScore > 0).length;
              return (
                <div key={tr.id} className="tournament-card" onClick={() => enterTournament(tr)} style={{ cursor: 'pointer' }}>
                  <div className="tournament-card-header">
                    <div className="tournament-card-info">
                      <span className="tournament-date">
                        {new Date(tr.date).toLocaleDateString(dateFmt)}
                      </span>
                      <span className="tournament-players">
                        {players.length} {t('play.players')} · {played}/{tr.matches.length} {t('play.matches')}
                      </span>
                    </div>
                    <div className="tournament-tags">
                      {tr.seasonId != null
                        ? <span className="tag tag-gold">{t('play.seasonal')}</span>
                        : <span className="tag tag-blue">{t('play.friendly')}</span>
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {clubActiveList.length > 0 && (
            <div className="club-games-section">
              <div className="club-games-title">{t('play.clubGames')}</div>
              <div className="tournament-list">
                {clubActiveList.map((tr) => {
                  const clubPlayers = getPlayersFromResult(tr);
                  const clubPlayed = tr.matches.filter((m) => m.teamOneScore > 0 || m.teamTwoScore > 0).length;
                  return (
                    <div key={tr.id} className="tournament-card" onClick={() => enterTournament(tr)} style={{ cursor: 'pointer' }}>
                      <div className="tournament-card-header">
                        <div className="tournament-card-info">
                          <span className="tournament-date">
                            {new Date(tr.date).toLocaleDateString(dateFmt)}
                          </span>
                          <span className="tournament-players">
                            {clubPlayers.length} {t('play.players')} · {clubPlayed}/{tr.matches.length} {t('play.matches')}
                          </span>
                        </div>
                        <div className="tournament-tags">
                          <span className="tag tag-muted">{t('match.spectator')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ marginTop: 16, flex: 'none' }}
            onClick={() => setScreen('select-count')}
          >
            {t('play.newTournament')}
          </button>
        </div>
      )}

      {screen === 'select-count' && <PlayerCountSelect onSelect={handleSelectCount} />}

      {screen === 'select-format' && (
        <FormatSelect
          playerCount={playerCount}
          onSelect={(opt) => handleSelectFormat(opt)}
          onBack={() => setScreen('select-count')}
        />
      )}

      {screen === 'select-players' && (
        <PlayerSelectForm
          count={playerCount}
          onSubmit={handlePlayersSubmit}
          onBack={() => setScreen('select-format')}
        />
      )}

      {screen === 'season-toggle' && (
        <div className="screen center-content">
          <div className="title-row">
            <h2 className="screen-title">{t('play.gameType')}</h2>
            <InfoTip text={t('play.gameType_hint')} />
          </div>
          <div className="season-toggle-options">
            <button
              className="format-button"
              onClick={() => startTournament(apiPlayers, true)}
            >
              <span className="format-button-title">{t('play.seasonal')}</span>
              <span className="format-button-desc">{t('play.seasonalDesc')}</span>
            </button>
            <button
              className="format-button"
              onClick={() => startTournament(apiPlayers, false)}
            >
              <span className="format-button-title">{t('play.friendly')}</span>
              <span className="format-button-desc">{t('play.friendlyDesc')}</span>
            </button>
          </div>
          <button className="btn btn-secondary" style={{ maxWidth: 360, width: '100%', flex: 'none' }} onClick={() => setScreen('select-players')}>
            {t('common.back')}
          </button>
        </div>
      )}

      {screen === 'match' && tournament && (
        <MatchView
          tournament={tournament}
          onUpdateScore={handleUpdateScore}
          onNext={handleNext}
          onPrev={handlePrev}
          onFinish={handleFinish}
          onCancel={isHost ? handleCancel : undefined}
          onEarlyFinish={isHost && !inSeason ? handleEarlyFinish : undefined}
          readOnly={!!tournament.id && !isHost}
          hostName={hostName}
          earlyFinishError={earlyFinishError}
        />
      )}

      {screen === 'results' && tournament && (
        <Results
          tournament={tournament}
          onRestart={handleRestart}
          onRematch={isHost && apiPlayers.length > 0 ? handleRematch : undefined}
          inSeason={inSeason}
          isLive={!!tournament.id}
        />
      )}
    </>
  );
}
