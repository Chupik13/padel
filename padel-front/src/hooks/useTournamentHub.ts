import { useRef, useCallback, useEffect } from 'react';
import { HubConnectionBuilder, HubConnection, HubConnectionState } from '@microsoft/signalr';

interface TournamentHubCallbacks {
  onScoreUpdated?: (tournamentId: number, matchIndex: number, teamOneScore: number, teamTwoScore: number) => void;
  onMatchNavigated?: (tournamentId: number, matchIndex: number) => void;
  onTournamentFinished?: (tournamentId: number) => void;
  onTournamentCancelled?: (tournamentId: number) => void;
  onStartRecording?: (matchIndex: number) => void;
  onStopRecording?: (matchIndex: number) => void;
  onOperatorJoined?: (playerId: number, cameraSide: number) => void;
  onOperatorRecordingStarted?: (playerId: number, cameraSide: number) => void;
  onGameStarted?: (tournamentId: number) => void;
}

export function useTournamentHub(callbacks: TournamentHubCallbacks) {
  const connectionRef = useRef<HubConnection | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Track which tournament we joined so we can re-join on reconnect
  const joinedTournamentRef = useRef<number | null>(null);
  const startedRef = useRef<Promise<void> | null>(null);

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

    connection.on('StartRecording', (matchIndex: number) => {
      callbacksRef.current.onStartRecording?.(matchIndex);
    });

    connection.on('StopRecording', (matchIndex: number) => {
      callbacksRef.current.onStopRecording?.(matchIndex);
    });

    connection.on('OperatorJoined', (playerId: number, cameraSide: number) => {
      callbacksRef.current.onOperatorJoined?.(playerId, cameraSide);
    });

    connection.on('OperatorRecordingStarted', (playerId: number, cameraSide: number) => {
      callbacksRef.current.onOperatorRecordingStarted?.(playerId, cameraSide);
    });

    connection.on('GameStarted', (tournamentId: number) => {
      callbacksRef.current.onGameStarted?.(tournamentId);
    });

    // Re-join tournament group on reconnect
    connection.onreconnected(async () => {
      console.log('[SignalR] Reconnected');
      const tid = joinedTournamentRef.current;
      if (tid !== null) {
        console.log('[SignalR] Re-joining tournament', tid);
        await connection.invoke('JoinTournament', tid);
      }
    });

    startedRef.current = connection.start().catch((e) => {
      console.error('[SignalR] Connection failed', e);
    });

    return () => {
      connection.stop();
    };
  }, []);

  const joinTournament = useCallback(async (tournamentId: number) => {
    // Wait for connection to be ready before joining
    if (startedRef.current) {
      await startedRef.current;
    }
    const conn = connectionRef.current;
    if (conn && conn.state === HubConnectionState.Connected) {
      console.log('[SignalR] JoinTournament', tournamentId);
      await conn.invoke('JoinTournament', tournamentId);
      joinedTournamentRef.current = tournamentId;
    } else {
      console.warn('[SignalR] JoinTournament SKIPPED — not connected, state:', conn?.state);
    }
  }, []);

  const leaveTournament = useCallback(async (tournamentId: number) => {
    if (startedRef.current) {
      await startedRef.current;
    }
    const conn = connectionRef.current;
    if (conn && conn.state === HubConnectionState.Connected) {
      await conn.invoke('LeaveTournament', tournamentId);
      joinedTournamentRef.current = null;
    }
  }, []);

  return { connection: connectionRef, joinTournament, leaveTournament };
}
