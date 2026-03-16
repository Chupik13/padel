import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import type { UploadStatus } from '../hooks/useVideoRecorder';
interface OperatorViewProps {
  tournamentId: number;
  cameraSide: number;
  matchIds: number[];
  currentMatchIndex: number;
  totalMatches: number;
  onExit: () => void;
}

export default function OperatorView({
  cameraSide,
  matchIds,
  currentMatchIndex,
  totalMatches,
  onExit,
}: OperatorViewProps) {
  const { t } = useTranslation();
  const videoElRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const {
    isRecording,
    uploadProgress,
    error,
    startRecording,
    stopSegment,
    startSegment,
    stopRecording,
    discardSegment,
    setMatchIds,
  } = useVideoRecorder(cameraSide);

  useEffect(() => {
    setMatchIds(matchIds);
  }, [matchIds, setMatchIds]);

  const handleStart = async () => {
    if (videoElRef.current) {
      await startRecording(videoElRef.current, currentMatchIndex);
      setStarted(true);
    }
  };

  const handleExit = async () => {
    if (isRecording) {
      await stopRecording();
    }
    onExit();
  };

  // Expose stopSegment/startSegment/stopRecording/discardSegment for SignalR via window
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__operatorStopSegment = stopSegment;
    (window as unknown as Record<string, unknown>).__operatorStartSegment = startSegment;
    (window as unknown as Record<string, unknown>).__operatorStop = stopRecording;
    (window as unknown as Record<string, unknown>).__operatorGameStarted = async () => {
      await discardSegment();
      startSegment(0);
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__operatorStopSegment;
      delete (window as unknown as Record<string, unknown>).__operatorStartSegment;
      delete (window as unknown as Record<string, unknown>).__operatorStop;
      delete (window as unknown as Record<string, unknown>).__operatorGameStarted;
    };
  }, [stopSegment, startSegment, stopRecording, discardSegment]);

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

  const statusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'done': return '\u2713';
      case 'uploading': return '\u23F3';
      case 'error': return '\u2717';
      case 'pending': return '\u2022';
      default: return '';
    }
  };

  return (
    <div className="operator-view">
      <video
        ref={videoElRef}
        autoPlay
        playsInline
        muted
        className="operator-video"
      />

      <div className="operator-overlay">
        <div className="operator-top">
          {isRecording && <span className="rec-indicator">REC</span>}
          <span className="operator-match-counter">
            {t('match.counter', { current: currentMatchIndex + 1, total: totalMatches })}
          </span>
          <span className="operator-side">
            {t('video.side' + cameraSide)}
          </span>
        </div>

        <div className="operator-uploads">
          {Array.from(uploadProgress.entries()).map(([idx, status]) => (
            <span key={idx} className={`upload-status upload-${status}`}>
              {idx + 1}{statusIcon(status)}
            </span>
          ))}
        </div>

        <div className="operator-bottom">
          {!started ? (
            <button className="btn btn-primary" onClick={handleStart}>
              {t('video.operatorMode')}
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
