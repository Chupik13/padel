import { useRef, useCallback, useEffect } from 'react';
import { HubConnectionBuilder, HubConnection, HubConnectionState } from '@microsoft/signalr';

interface TournamentHubCallbacks {
  onScoreUpdated?: (tournamentId: number, matchIndex: number, teamOneScore: number, teamTwoScore: number) => void;
  onMatchNavigated?: (tournamentId: number, matchIndex: number) => void;
  onTournamentFinished?: (tournamentId: number) => void;
  onTournamentCancelled?: (tournamentId: number) => void;
}

export function useTournamentHub(callbacks: TournamentHubCallbacks) {
  const connectionRef = useRef<HubConnection | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/tournament')
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.on('ScoreUpdated', (tournamentId: number, matchIndex: number, teamOneScore: number, teamTwoScore: number) => {
      callbacksRef.current.onScoreUpdated?.(tournamentId, matchIndex, teamOneScore, teamTwoScore);
    });

    connection.on('MatchNavigated', (tournamentId: number, matchIndex: number) => {
      callbacksRef.current.onMatchNavigated?.(tournamentId, matchIndex);
    });

    connection.on('TournamentFinished', (tournamentId: number) => {
      callbacksRef.current.onTournamentFinished?.(tournamentId);
    });

    connection.on('TournamentCancelled', (tournamentId: number) => {
      callbacksRef.current.onTournamentCancelled?.(tournamentId);
    });

    connection.start().catch(() => {});

    return () => {
      connection.stop();
    };
  }, []);

  const joinTournament = useCallback(async (tournamentId: number) => {
    const conn = connectionRef.current;
    if (conn && conn.state === HubConnectionState.Connected) {
      await conn.invoke('JoinTournament', tournamentId);
    }
  }, []);

  const leaveTournament = useCallback(async (tournamentId: number) => {
    const conn = connectionRef.current;
    if (conn && conn.state === HubConnectionState.Connected) {
      await conn.invoke('LeaveTournament', tournamentId);
    }
  }, []);

  return { connection: connectionRef, joinTournament, leaveTournament };
}
