import { useState, useRef, useCallback } from 'react';
import { uploadVideoSegment } from '../api/videos';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

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

export function useVideoRecorder(cameraSide: number) {
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, UploadStatus>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const currentMatchRef = useRef<number>(0);
  const matchIdsRef = useRef<number[]>([]);
  const mimeTypeRef = useRef<string>('');
  const pendingStopRef = useRef<Promise<void> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const setMatchIds = useCallback((ids: number[]) => {
    matchIdsRef.current = ids;
  }, []);

  const uploadBlob = useCallback(async (matchIndex: number, blob: Blob, retries = 3) => {
    const matchId = matchIdsRef.current[matchIndex];
    if (!matchId) return;

    setUploadProgress((prev) => new Map(prev).set(matchIndex, 'uploading'));

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const contentType = mimeTypeRef.current.split(';')[0];
        await uploadVideoSegment(matchId, cameraSide, blob, contentType);
        setUploadProgress((prev) => new Map(prev).set(matchIndex, 'done'));
        return;
      } catch {
        if (attempt === retries - 1) {
          setUploadProgress((prev) => new Map(prev).set(matchIndex, 'error'));
        }
      }
    }
  }, [cameraSide]);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const createRecorder = useCallback(() => {
    if (!streamRef.current || !streamRef.current.active) return;
    const recorder = new MediaRecorder(streamRef.current, { mimeType: mimeTypeRef.current });
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      });

      streamRef.current = stream;
      videoElement.srcObject = stream;

      // Detect stream interruption (phone call, OS camera revoke)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
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
    } catch {
      setError('cameraAccessDenied');
    }
  }, [createRecorder, acquireWakeLock, releaseWakeLock, releaseStream]);

  // Stop current segment, upload it. Does NOT start a new one.
  const stopSegment = useCallback((): Promise<void> => {
    const promise = new Promise<void>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== 'recording') {
        resolve();
        return;
      }

      const matchIndex = currentMatchRef.current;
      const capturedChunks = chunksRef.current;

      recorder.onstop = () => {
        const blob = new Blob(capturedChunks, { type: mimeTypeRef.current });
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

  // Start a new recording segment for a given match index.
  const startSegment = useCallback(async (matchIndex: number) => {
    if (pendingStopRef.current) {
      await pendingStopRef.current;
    }
    currentMatchRef.current = matchIndex;
    createRecorder();
  }, [createRecorder]);

  // Final stop: upload last segment + release camera.
  const stopRecording = useCallback(async () => {
    await stopSegment();
    releaseStream();
    setIsRecording(false);
    releaseWakeLock();
  }, [stopSegment, releaseStream, releaseWakeLock]);

  return {
    isRecording,
    uploadProgress,
    error,
    startRecording,
    stopSegment,
    startSegment,
    stopRecording,
    discardSegment,
    setMatchIds,
  };
}
