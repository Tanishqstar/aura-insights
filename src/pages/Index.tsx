import { Mic, Square, RotateCcw, Activity } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { StressGauge } from "@/components/StressGauge";
import { MetricCard } from "@/components/MetricCard";
import { RecordingHistory } from "@/components/RecordingHistory";
import { PitchChart } from "@/components/PitchChart";
import { useState, useEffect } from "react";

const Index = () => {
  const recorder = useAudioRecorder(60);
  const [demoScore, setDemoScore] = useState(34);

  // Simulate score fluctuation during recording
  useEffect(() => {
    if (!recorder.isRecording) return;
    const interval = setInterval(() => {
      setDemoScore(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.45) * 8)));
    }, 800);
    return () => clearInterval(interval);
  }, [recorder.isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const remaining = recorder.maxDuration - recorder.duration;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground tracking-tight">VoiceStress</h1>
              <p className="text-xs text-muted-foreground">Biometric Acoustic Analyzer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${recorder.isRecording ? "bg-recording animate-pulse-recording" : "bg-stress-low"}`} />
            <span className="text-xs text-muted-foreground font-mono">
              {recorder.isRecording ? "RECORDING" : "STANDBY"}
            </span>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 py-8">
        {/* Error overlay */}
        {recorder.error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            ⚠ Microphone Error: {recorder.error}. Please allow microphone access and reload.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Recorder + Waveform */}
          <div className="lg:col-span-2 space-y-6">
            {/* Waveform card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
                  Audio Signal
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-bold text-foreground">
                    {formatTime(recorder.duration)}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    / {formatTime(recorder.maxDuration)}
                  </span>
                </div>
              </div>

              <WaveformVisualizer
                analyserNode={recorder.analyserNode}
                isRecording={recorder.isRecording}
              />

              {/* Timer bar */}
              <div className="mt-4 h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-linear"
                  style={{ width: `${(recorder.duration / recorder.maxDuration) * 100}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mt-6">
                {!recorder.isRecording ? (
                  <button
                    onClick={recorder.startRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity glow-primary"
                  >
                    <Mic className="w-4 h-4" />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={recorder.stopRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-recording text-destructive-foreground font-semibold text-sm hover:opacity-90 transition-opacity glow-recording"
                  >
                    <Square className="w-4 h-4" />
                    Stop ({formatTime(remaining)})
                  </button>
                )}
                {recorder.audioBlob && (
                  <button
                    onClick={recorder.resetRecording}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                )}
              </div>

              {recorder.audioBlob && (
                <div className="mt-4 flex justify-center">
                  <audio controls src={URL.createObjectURL(recorder.audioBlob)} className="w-full max-w-md" />
                </div>
              )}
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                title="Pitch (F₀)"
                value={recorder.isRecording ? (120 + Math.round(demoScore * 0.8)).toString() : "—"}
                unit="Hz"
                subtitle="Fundamental frequency"
                status={demoScore > 60 ? "warning" : "normal"}
              />
              <MetricCard
                title="Tremor Index"
                value={recorder.isRecording ? (demoScore * 0.05).toFixed(2) : "—"}
                unit="σ"
                subtitle="Micro-tremor deviation"
                status={demoScore > 70 ? "critical" : demoScore > 40 ? "warning" : "normal"}
              />
              <MetricCard
                title="Pacing"
                value={recorder.isRecording ? Math.round(180 + demoScore * 0.5).toString() : "—"}
                unit="SPM"
                subtitle="Syllables per minute"
                status={demoScore > 65 ? "warning" : "normal"}
              />
            </div>

            {/* Pitch chart */}
            <PitchChart
              isRecording={recorder.isRecording}
              analyserNode={recorder.analyserNode}
            />
          </div>

          {/* Right column: Gauge + History */}
          <div className="space-y-6">
            {/* Stress gauge card */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 self-start">
                Composite Analysis
              </h2>
              <StressGauge score={Math.round(demoScore)} />
              <div className="w-full mt-6 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono text-foreground">{recorder.isRecording ? "87%" : "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Trigger Keywords</span>
                  <span className="font-mono text-foreground">{recorder.isRecording ? "3 detected" : "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Data Quality</span>
                  <span className="font-mono text-primary">{recorder.isRecording ? "FULL" : "STANDBY"}</span>
                </div>
              </div>
            </div>

            {/* History */}
            <RecordingHistory />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
