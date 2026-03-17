import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import type { UploadStatus } from '../hooks/useVideoRecorder';
import { notifyRecordingStarted } from '../api/videos';

interface OperatorViewProps {
  tournamentId: number;
  cameraSide: number;
  matchIds: number[];
  currentMatchIndex: number;
  totalMatches: number;
  isFinished?: boolean;
  onExit: () => void;
}

export default function OperatorView({
  tournamentId,
  cameraSide,
  matchIds,
  currentMatchIndex,
  totalMatches,
  isFinished,
  onExit,
}: OperatorViewProps) {
  const { t } = useTranslation();
  const videoElRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const {
    isRecording,
    uploadProgress,
    error,
    countdown,
    startRecording,
    stopRecording,
    discardSegment,
    setMatchIds,
    startSegmentDelayed,
    cancelDelay,
  } = useVideoRecorder(cameraSide, 'landscape');

  useEffect(() => {
    setMatchIds(matchIds);
  }, [matchIds, setMatchIds]);

  // Lock to landscape on mount
  useEffect(() => {
    (async () => {
      try {
        await document.documentElement.requestFullscreen();
        await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock('landscape');
      } catch (e) {
        console.log('Fullscreen/lock failed (non-critical):', e);
      }
    })();
  }, []);

  // Watch for tournament finish — stop recording once
  const finishHandledRef = useRef(false);
  useEffect(() => {
    if (isFinished && started && !finishHandledRef.current) {
      finishHandledRef.current = true;
      cancelDelay();
      stopRecording(10).then(() => {
        try { screen.orientation?.unlock?.(); } catch {}
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        setSessionEnded(true);
      });
    }
  }, [isFinished, started, cancelDelay, stopRecording]);

  const handleStart = async () => {
    if (starting || !videoElRef.current) return;
    setStarting(true);
    await startRecording(videoElRef.current, currentMatchIndex);
    setStarted(true);
    notifyRecordingStarted(tournamentId).catch(() => {});
  };

  const handleExit = async () => {
    if (isRecording || countdown !== null) {
      cancelDelay();
      await stopRecording(10);
    }
    try { screen.orientation?.unlock?.(); } catch {}
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setSessionEnded(true);
    onExit();
  };

  // Expose segment control for SignalR via window
  useEffect(() => {
    // StopSegment is a no-op: startSegmentDelayed handles stop+trim of previous segment.
    // This prevents double-stop when StopRecording and StartRecording arrive together.
    (window as unknown as Record<string, unknown>).__operatorStopSegment = () => {
      // no-op — handled by startSegmentDelayed
    };
    (window as unknown as Record<string, unknown>).__operatorStartSegment = (matchIndex: number) => {
      startSegmentDelayed(matchIndex, 20, 10);
    };
    (window as unknown as Record<string, unknown>).__operatorStop = async () => {
      cancelDelay();
      await stopRecording(10);
      setSessionEnded(true);
    };
    (window as unknown as Record<string, unknown>).__operatorGameStarted = async () => {
      await discardSegment();
      startSegmentDelayed(0, 10, 0);
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__operatorStopSegment;
      delete (window as unknown as Record<string, unknown>).__operatorStartSegment;
      delete (window as unknown as Record<string, unknown>).__operatorStop;
      delete (window as unknown as Record<string, unknown>).__operatorGameStarted;
    };
  }, [stopRecording, discardSegment, startSegmentDelayed, cancelDelay]);

  // Upload overlay state
  const uploads = Array.from(uploadProgress.entries());
  const hasUploads = uploads.length > 0;
  const doneCount = uploads.filter(([, s]) => s === 'done').length;
  const errorCount = uploads.filter(([, s]) => s === 'error').length;
  const allFinished = hasUploads && doneCount + errorCount === uploads.length;
  const showUploadOverlay = sessionEnded && hasUploads;

  // Auto-exit when all uploads complete
  useEffect(() => {
    if (showUploadOverlay && allFinished) {
      const timer = setTimeout(onExit, 2000);
      return () => clearTimeout(timer);
    }
  }, [showUploadOverlay, allFinished, onExit]);

  if (error) {
    return (
      <div className="screen center-content">
        <p className="error">{t(`video.${error}`)}</p>
        <button className="btn btn-secondary" onClick={onExit}>
          {t('common.back')}
        </button>
      </div>
    );
  }

  // Derive full match status: recording / countdown / upload status / waiting
  type MatchState = 'recording' | 'countdown' | UploadStatus | 'waiting';
  const getMatchState = (idx: number): MatchState => {
    if (countdown !== null && idx === currentMatchIndex) return 'countdown';
    if (isRecording && idx === currentMatchIndex) return 'recording';
    const upload = uploadProgress.get(idx);
    if (upload) return upload;
    return 'waiting';
  };

  const stateIcon = (state: MatchState) => {
    switch (state) {
      case 'recording': return '';
      case 'countdown': return '\u23F1';
      case 'done': return '\u2713';
      case 'uploading': return '\u23F3';
      case 'error': return '\u2717';
      case 'pending': return '\u2022';
      case 'waiting': return '';
    }
  };

  const stateLabel = (state: MatchState) => {
    switch (state) {
      case 'recording': return t('video.recording');
      case 'countdown': return t('video.countdown');
      case 'done': return t('video.uploaded');
      case 'uploading': return t('video.uploading');
      case 'error': return t('video.uploadFailed');
      case 'pending': return t('video.uploadPending');
      case 'waiting': return '';
    }
  };

  // Upload overlay — shown after recording stops while uploads are in progress
  if (showUploadOverlay) {
    return (
      <div className="operator-view">
        <div className="upload-overlay">
          <div className="upload-overlay-content">
            {!allFinished ? (
              <>
                <div className="upload-spinner" />
                <h2 className="upload-overlay-title">{t('video.uploadingTitle')}</h2>
                <p className="upload-overlay-hint">{t('video.uploadingHint')}</p>
                <p className="upload-overlay-counter">
                  {t('video.uploadingCount', { done: doneCount, total: uploads.length })}
                </p>
              </>
            ) : (
              <>
                <div className="upload-done-icon">{errorCount > 0 ? '!' : '\u2713'}</div>
                <h2 className="upload-overlay-title">{t('video.uploadComplete')}</h2>
              </>
            )}
            <div className="upload-overlay-list">
              {uploads.map(([idx, status]) => (
                <div key={idx} className={`upload-overlay-item upload-overlay-${status}`}>
                  <span>{t('video.uploadingMatch', { num: idx + 1 })}</span>
                  <span className="upload-overlay-icon">{stateIcon(status)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Build list of matches to show in status panel (only relevant ones)
  const matchStatuses: { idx: number; state: MatchState }[] = [];
  if (started) {
    for (let i = 0; i < totalMatches; i++) {
      const state = getMatchState(i);
      if (state !== 'waiting') {
        matchStatuses.push({ idx: i, state });
      }
    }
  }

  return (
    <div className="operator-view">
      <video
        ref={videoElRef}
        autoPlay
        playsInline
        muted
        className="operator-video"
      />

      {/* Countdown overlay */}
      {countdown !== null && countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-content">
            <div className="countdown-label">{t('video.countdown')}</div>
            <div className="countdown-number" key={countdown}>{countdown}</div>
          </div>
        </div>
      )}

      <div className="operator-overlay">
        <div className="operator-top">
          {isRecording && <span className="rec-indicator">REC</span>}
          {!isRecording && countdown !== null && <span className="wait-indicator">{t('video.waitIndicator')}</span>}
          <span className="operator-match-counter">
            {t('match.counter', { current: currentMatchIndex + 1, total: totalMatches })}
          </span>
          <span className="operator-side">
            {t('video.side' + cameraSide)}
          </span>
        </div>

        {matchStatuses.length > 0 && (
          <div className="operator-status-panel">
            {matchStatuses.map(({ idx, state }) => (
              <div key={idx} className={`operator-status-row operator-status-${state}`}>
                <span className="operator-status-match">
                  {t('video.uploadingMatch', { num: idx + 1 })}
                </span>
                <span className="operator-status-label">
                  {stateLabel(state)}
                </span>
                <span className="operator-status-icon">
                  {stateIcon(state)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="operator-bottom">
          {!started ? (
            <button className="btn btn-primary" onClick={handleStart} disabled={starting}>
              {starting ? (
                <><div className="btn-spinner" /> {t('video.cameraLoading')}</>
              ) : (
                t('video.operatorMode')
              )}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handleExit}>
              {t('video.exitOperator')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
