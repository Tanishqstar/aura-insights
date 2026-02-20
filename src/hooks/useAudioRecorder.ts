import { useState, useRef, useCallback, useEffect } from "react";

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  maxDuration: number;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null;
  error: string | null;
}

export function useAudioRecorder(maxDuration = 60) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    maxDuration,
    audioBlob: null,
    analyserNode: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") {
      try { mediaRecorderRef.current?.stop(); } catch {}
    }
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      cleanup();
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setState(prev => ({ ...prev, audioBlob: blob, isRecording: false, analyserNode: null }));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (elapsed >= maxDuration) {
          stopRecording();
        } else {
          setState(prev => ({ ...prev, duration: elapsed }));
        }
      }, 200);

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        maxDuration,
        audioBlob: null,
        analyserNode: analyser,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "Microphone access denied",
      }));
    }
  }, [cleanup, maxDuration]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") {
      try { mediaRecorderRef.current?.stop(); } catch {}
    }
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
  }, []);

  const resetRecording = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      maxDuration,
      audioBlob: null,
      analyserNode: null,
      error: null,
    });
  }, [cleanup, maxDuration]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { ...state, startRecording, stopRecording, resetRecording };
}
