import { useState, useRef, useCallback, useEffect } from 'react';
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

export function useVideoRecorder(cameraSide: number, orientation: string = 'landscape') {
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
  const startingRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orientationRef = useRef(orientation);
  // Guard: prevent duplicate startSegmentDelayed for the same match
  const segmentDelayMatchRef = useRef(-1);
  // Guard: prevent duplicate stopRecording calls
  const stoppedRef = useRef(false);

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

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
        const ori = orientationRef.current;
        log('uploadBlob orientation:', ori);
        await uploadVideoSegment(matchId, cameraSide, blob, contentType, ori);
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
  }, [cameraSide]);

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
    // Prevent creating a second recorder if one is already active
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      log('createRecorder SKIP — recorder already active');
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
    log('startRecording', { initialMatchIndex, alreadyStarting: startingRef.current });
    if (startingRef.current) {
      log('startRecording SKIP — already starting');
      return;
    }
    startingRef.current = true;
    stoppedRef.current = false;
    try {
      // Step 1: Find the best camera deviceId (prefer one with torch)
      let bestDeviceId: string | undefined;
      try {
        const probe = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } },
          audio: false,
        }).catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }));

        const probeTrack = probe.getVideoTracks()[0];
        const probeCaps = probeTrack?.getCapabilities?.() as Record<string, unknown> | undefined;
        const probeDeviceId = probeTrack?.getSettings?.().deviceId;
        log('probe camera:', probeTrack?.label, '| torch:', probeCaps?.torch, '| deviceId:', probeDeviceId?.slice(0, 8));

        if (probeCaps?.torch) {
          bestDeviceId = probeDeviceId;
          log('probe camera has torch, using it');
        } else {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const otherCams = devices.filter(d => d.kind === 'videoinput' && d.deviceId !== probeDeviceId);
          log('scanning', otherCams.length, 'other cameras for torch...');
          probeTrack?.stop();

          for (const cam of otherCams) {
            try {
              const testStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: cam.deviceId } },
                audio: false,
              });
              const testTrack = testStream.getVideoTracks()[0];
              const testCaps = testTrack?.getCapabilities?.() as Record<string, unknown> | undefined;
              log('test camera:', testTrack?.label, '| torch:', testCaps?.torch);
              testTrack?.stop();

              if (testCaps?.torch) {
                bestDeviceId = cam.deviceId;
                log('FOUND torch camera:', testTrack?.label);
                break;
              }
            } catch (e) {
              log('skip camera', cam.label, e);
            }
          }

          if (!bestDeviceId) {
            bestDeviceId = probeDeviceId;
            log('no torch camera found, using original');
          }
        }

        probe.getTracks().forEach(t => t.stop());
      } catch (e) {
        log('camera probe error, will use default', e);
      }

      // Step 2: Create a SINGLE clean stream with the chosen camera + audio
      let stream: MediaStream;
      const videoConstraints = bestDeviceId
        ? { deviceId: { exact: bestDeviceId } }
        : { facingMode: { ideal: 'environment' } };
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      streamRef.current = stream;
      videoElement.srcObject = stream;

      const finalTrack = stream.getVideoTracks()[0];
      const finalCaps = finalTrack?.getCapabilities?.() as Record<string, unknown> | undefined;
      log('final camera:', finalTrack?.label, '| torch:', finalCaps?.torch);

      // Detect stream interruption
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          log('videoTrack ended — stream interrupted');
          releaseStream();
          recorderRef.current = null;
          setIsRecording(false);
          setError('streamInterrupted');
          releaseWakeLock();
        };
      }

      await acquireWakeLock();

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
    } finally {
      startingRef.current = false;
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
  const blinkTorch = useCallback(async () => {
    try {
      const videoTrack = streamRef.current?.getVideoTracks()[0];
      if (!videoTrack) {
        log('blinkTorch: no video track');
        return;
      }

      const caps = videoTrack.getCapabilities?.() as Record<string, unknown> | undefined;
      log('blinkTorch: torch capability =', caps?.torch, '| label =', videoTrack.label);

      if (caps?.torch === false) {
        log('blinkTorch SKIP — torch explicitly false');
        return;
      }

      log('blinkTorch: applying torch=true (advanced)...');
      await videoTrack.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });

      const afterSettings = videoTrack.getSettings?.() as Record<string, unknown> | undefined;
      log('blinkTorch: after ON — settings.torch =', afterSettings?.torch);

      await new Promise((r) => setTimeout(r, 200));
      await videoTrack.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] });
      await new Promise((r) => setTimeout(r, 200));

      await videoTrack.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
      await new Promise((r) => setTimeout(r, 200));
      await videoTrack.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] });

      log('blinkTorch: done OK');
    } catch (e) {
      log('blinkTorch error (non-critical):', (e as Error)?.name, (e as Error)?.message);
    }
  }, []);

  // Cancel pending countdown — clears tracked interval/timeout refs
  const cancelDelay = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    segmentDelayMatchRef.current = -1;
    setCountdown(null);
  }, []);

  // Start a new segment after a delay, with optional trimming of previous segment
  const startSegmentDelayed = useCallback(async (matchIndex: number, delaySec: number, trimPrevSec: number) => {
    log('startSegmentDelayed', { matchIndex, delaySec, trimPrevSec });

    // Guard: prevent duplicate call for the same match
    if (segmentDelayMatchRef.current === matchIndex) {
      log('startSegmentDelayed SKIP — duplicate for match', matchIndex);
      return;
    }
    segmentDelayMatchRef.current = matchIndex;

    // Cancel any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }

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

    // Capture interval ID in closure for reliable self-clearing
    const intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        setCountdown(0);
        clearInterval(intervalId);
        if (countdownIntervalRef.current === intervalId) {
          countdownIntervalRef.current = null;
        }
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    countdownIntervalRef.current = intervalId;

    // When countdown finishes — blink, wait 1 sec, then start recording
    const timeoutId = setTimeout(async () => {
      if (countdownTimeoutRef.current === timeoutId) {
        countdownTimeoutRef.current = null;
      }
      setCountdown(null);
      await blinkTorch();
      // 1-second delay after blink to trim flash artifact
      await new Promise((r) => setTimeout(r, 1000));
      createRecorder();
      setIsRecording(true);
    }, delaySec * 1000);
    countdownTimeoutRef.current = timeoutId;
  }, [stopSegment, blinkTorch, createRecorder]);

  // Start a new recording segment for a given match index.
  const startSegment = useCallback(async (matchIndex: number) => {
    log('startSegment', { matchIndex, pendingStop: !!pendingStopRef.current, recorderState: recorderRef.current?.state });
    if (pendingStopRef.current) {
      await pendingStopRef.current;
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      log('startSegment — force stopping active recorder');
      await stopSegment();
    }
    currentMatchRef.current = matchIndex;
    createRecorder();
  }, [createRecorder, stopSegment]);

  // Final stop: upload last segment + release camera.
  const stopRecording = useCallback(async (trimSeconds = 0) => {
    // Guard: only stop once
    if (stoppedRef.current) {
      log('stopRecording SKIP — already stopped');
      return;
    }
    stoppedRef.current = true;
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
