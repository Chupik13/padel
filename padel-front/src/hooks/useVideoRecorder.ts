import { useState, useRef, useCallback } from 'react';
import { uploadVideoSegment } from '../api/videos';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

function log(...args: unknown[]) {
  console.log(`[VideoRecorder ${new Date().toISOString()}]`, ...args);
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'video/webm';
}

export function useVideoRecorder(cameraSide: number, orientation = 'landscape') {
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, UploadStatus>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const currentMatchRef = useRef<number>(0);
  const matchIdsRef = useRef<number[]>([]);
  const mimeTypeRef = useRef<string>('');
  const pendingStopRef = useRef<Promise<void> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setMatchIds = useCallback((ids: number[]) => {
    matchIdsRef.current = ids;
    log('setMatchIds', ids);
  }, []);

  const uploadBlob = useCallback(async (matchIndex: number, blob: Blob, retries = 3) => {
    const matchId = matchIdsRef.current[matchIndex];
    if (!matchId) {
      log('uploadBlob SKIP — no matchId for index', matchIndex, 'matchIds:', matchIdsRef.current);
      return;
    }

    log('uploadBlob start', { matchIndex, matchId, blobSize: blob.size });
    setUploadProgress((prev) => new Map(prev).set(matchIndex, 'uploading'));

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          log('uploadBlob retry delay', { attempt, delay });
          await new Promise((r) => setTimeout(r, delay));
        }
        const contentType = mimeTypeRef.current.split(';')[0];
        await uploadVideoSegment(matchId, cameraSide, blob, contentType, orientation);
        log('uploadBlob SUCCESS', { matchIndex, matchId, attempt });
        setUploadProgress((prev) => new Map(prev).set(matchIndex, 'done'));
        return;
      } catch (e) {
        log('uploadBlob FAIL', { matchIndex, matchId, attempt, error: e });
        if (attempt === retries - 1) {
          setUploadProgress((prev) => new Map(prev).set(matchIndex, 'error'));
        }
      }
    }
  }, [cameraSide, orientation]);

  const releaseStream = useCallback(() => {
    log('releaseStream');
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const createRecorder = useCallback(() => {
    if (!streamRef.current || !streamRef.current.active) {
      log('createRecorder SKIP — stream not active', { hasStream: !!streamRef.current, active: streamRef.current?.active });
      return;
    }
    log('createRecorder — match', currentMatchRef.current);
    const recorder = new MediaRecorder(streamRef.current, { mimeType: mimeTypeRef.current });
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000); // timeslice: 1-second chunks for trimming support
  }, []);

  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch { /* wake lock not available or denied */ }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  const startRecording = useCallback(async (videoElement: HTMLVideoElement, initialMatchIndex = 0) => {
    log('startRecording', { initialMatchIndex });
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: true,
        });
      } catch {
        // Fallback: any camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }

      streamRef.current = stream;
      videoElement.srcObject = stream;

      // Detect stream interruption (phone call, OS camera revoke)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          log('videoTrack ended — stream interrupted');
          // Release camera so reconnection can acquire it
          releaseStream();
          recorderRef.current = null;
          setIsRecording(false);
          setError('streamInterrupted');
          releaseWakeLock();
        };
      }

      await acquireWakeLock();

      // Re-acquire wake lock when page becomes visible again
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible' && streamRef.current?.active) {
          acquireWakeLock();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      stream.addEventListener('inactive', () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      });

      currentMatchRef.current = initialMatchIndex;
      mimeTypeRef.current = getSupportedMimeType();
      createRecorder();
      setIsRecording(true);
      setError(null);
      log('startRecording OK');
    } catch (e) {
      log('startRecording FAIL', e);
      setError('cameraAccessDenied');
    }
  }, [createRecorder, acquireWakeLock, releaseWakeLock, releaseStream]);

  // Stop current segment, upload it (with optional trimming). Does NOT start a new one.
  const stopSegment = useCallback((trimSeconds = 0): Promise<void> => {
    const recorder = recorderRef.current;
    log('stopSegment', { match: currentMatchRef.current, recorderState: recorder?.state, trimSeconds });
    const promise = new Promise<void>((resolve) => {
      if (!recorder || recorder.state !== 'recording') {
        log('stopSegment — nothing to stop');
        resolve();
        return;
      }

      const matchIndex = currentMatchRef.current;

      recorder.onstop = () => {
        const capturedChunks = chunksRef.current;
        // Trim last N seconds (each chunk ≈ 1 second from timeslice)
        const trimmed = trimSeconds > 0 && capturedChunks.length > trimSeconds
          ? capturedChunks.slice(0, -trimSeconds)
          : capturedChunks;
        const blob = new Blob(trimmed, { type: mimeTypeRef.current });
        log('stopSegment recorder.onstop', { matchIndex, blobSize: blob.size, chunks: capturedChunks.length, trimmed: capturedChunks.length - trimmed.length });
        if (blob.size > 0) {
          setUploadProgress((prev) => new Map(prev).set(matchIndex, 'pending'));
          uploadBlob(matchIndex, blob);
        }
        recorderRef.current = null;
        pendingStopRef.current = null;
        resolve();
      };
      recorder.stop();
    });
    pendingStopRef.current = promise;
    return promise;
  }, [uploadBlob]);

  // Discard current segment without uploading
  const discardSegment = useCallback((): Promise<void> => {
    log('discardSegment', { match: currentMatchRef.current });
    const promise = new Promise<void>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== 'recording') {
        resolve();
        return;
      }
      recorder.onstop = () => {
        chunksRef.current = [];
        recorderRef.current = null;
        pendingStopRef.current = null;
        resolve();
      };
      recorder.stop();
    });
    pendingStopRef.current = promise;
    return promise;
  }, []);

  // Blink torch (flashlight) twice as a signal.
  // Try multiple methods: iOS uses advanced constraints, Android needs direct constraints.
  const blinkTorch = useCallback(async () => {
    try {
      const videoTrack = streamRef.current?.getVideoTracks()[0];
      if (!videoTrack) return;

      // Detect which torch method works
      const setTorch = async (on: boolean) => {
        try {
          // Method 1: advanced constraints (iOS Safari)
          await videoTrack.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
        } catch {
          // Method 2: direct constraint (Android Chrome)
          await videoTrack.applyConstraints({ torch: on } as unknown as MediaTrackConstraints);
        }
      };

      const blink = async () => {
        await setTorch(true);
        await new Promise((r) => setTimeout(r, 200));
        await setTorch(false);
      };

      await blink();
      await new Promise((r) => setTimeout(r, 200));
      await blink();
    } catch (e) {
      log('blinkTorch error (non-critical)', e);
    }
  }, []);

  // Cancel pending countdown
  const cancelDelay = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    setCountdown(null);
  }, []);

  // Start a new segment after a delay, with optional trimming of previous segment
  const startSegmentDelayed = useCallback(async (matchIndex: number, delaySec: number, trimPrevSec: number) => {
    log('startSegmentDelayed', { matchIndex, delaySec, trimPrevSec });

    // Stop previous segment with trimming if there's an active recorder
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      await stopSegment(trimPrevSec);
    }
    if (pendingStopRef.current) {
      await pendingStopRef.current;
    }

    currentMatchRef.current = matchIndex;
    setIsRecording(false);

    // Start countdown
    let remaining = delaySec;
    setCountdown(remaining);

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        setCountdown(0);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    // When countdown finishes — blink and start recording
    countdownTimeoutRef.current = setTimeout(async () => {
      countdownTimeoutRef.current = null;
      await blinkTorch();
      createRecorder();
      setIsRecording(true);
      setCountdown(null);
    }, delaySec * 1000);
  }, [stopSegment, blinkTorch, createRecorder]);

  // Start a new recording segment for a given match index.
  const startSegment = useCallback(async (matchIndex: number) => {
    log('startSegment', { matchIndex, pendingStop: !!pendingStopRef.current, recorderState: recorderRef.current?.state });
    if (pendingStopRef.current) {
      await pendingStopRef.current;
    }
    // Safety: stop active recorder that wasn't stopped via stopSegment
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      log('startSegment — force stopping active recorder');
      await stopSegment();
    }
    currentMatchRef.current = matchIndex;
    createRecorder();
  }, [createRecorder, stopSegment]);

  // Final stop: upload last segment + release camera.
  const stopRecording = useCallback(async (trimSeconds = 0) => {
    log('stopRecording (final)', { trimSeconds });
    cancelDelay();
    await stopSegment(trimSeconds);
    releaseStream();
    setIsRecording(false);
    releaseWakeLock();
  }, [stopSegment, releaseStream, releaseWakeLock, cancelDelay]);

  return {
    isRecording,
    uploadProgress,
    error,
    countdown,
    startRecording,
    stopSegment,
    startSegment,
    stopRecording,
    discardSegment,
    setMatchIds,
    startSegmentDelayed,
    cancelDelay,
  };
}
