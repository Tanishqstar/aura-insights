import { Mic, Square, RotateCcw, Activity, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { StressGauge } from "@/components/StressGauge";
import { MetricCard } from "@/components/MetricCard";
import { RecordingHistory } from "@/components/RecordingHistory";
import { PitchChart } from "@/components/PitchChart";
import { submitForAnalysis, StressAnalysisResult } from "@/lib/stressAnalysis";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const Index = () => {
  const recorder = useAudioRecorder(60);
  const [liveMetrics, setLiveMetrics] = useState({ pitchHz: 0, tremorIndex: 0, pacingSpm: 0 });
  const [stressScore, setStressScore] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<StressAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const metricsRef = useRef(liveMetrics);

  // Live metric simulation from analyser during recording
  useEffect(() => {
    if (!recorder.isRecording || !recorder.analyserNode) return;
    const interval = setInterval(() => {
      const analyser = recorder.analyserNode!;
      const freq = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freq);

      const lowEnergy = freq.slice(0, 30).reduce((a, b) => a + b, 0) / 30;
      const midEnergy = freq.slice(30, 100).reduce((a, b) => a + b, 0) / 70;

      const pitchHz = 100 + (lowEnergy / 255) * 150;
      const tremorIndex = (midEnergy / 255) * 3.5;
      const pacingSpm = 170 + (lowEnergy / 255) * 80;

      const metrics = { pitchHz, tremorIndex, pacingSpm };
      setLiveMetrics(metrics);
      metricsRef.current = metrics;

      // Live stress estimate
      const score = Math.min(100, Math.max(0,
        (tremorIndex > 2 ? 35 : tremorIndex > 1 ? 18 : 5) +
        (pacingSpm > 230 ? 25 : pacingSpm > 210 ? 12 : 3) +
        (pitchHz > 190 ? 20 : pitchHz > 150 ? 10 : 2) +
        Math.random() * 5
      ));
      setStressScore(score);
    }, 200);
    return () => clearInterval(interval);
  }, [recorder.isRecording, recorder.analyserNode]);

  // Auto-submit when recording stops with a blob
  useEffect(() => {
    if (recorder.audioBlob && !isAnalyzing && !analysisResult) {
      handleAnalysis();
    }
  }, [recorder.audioBlob]);

  const handleAnalysis = async () => {
    if (!recorder.audioBlob) return;
    setIsAnalyzing(true);
    toast.info("Analyzing voice patterns...");

    try {
      const result = await submitForAnalysis(recorder.audioBlob, recorder.duration, metricsRef.current);
      setAnalysisResult(result);
      setStressScore(result.stress_score);
      setHistoryRefresh(prev => prev + 1);
      toast.success(result.fallback
        ? "Analysis complete (limited data — AI fallback)"
        : "AI analysis complete"
      );
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    recorder.resetRecording();
    setAnalysisResult(null);
    setStressScore(0);
    setLiveMetrics({ pitchHz: 0, tremorIndex: 0, pacingSpm: 0 });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const remaining = recorder.maxDuration - recorder.duration;
  const showMetrics = recorder.isRecording || analysisResult;

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
            {isAnalyzing ? (
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
            ) : (
              <span className={`w-2 h-2 rounded-full ${recorder.isRecording ? "bg-recording animate-pulse-recording" : "bg-stress-low"}`} />
            )}
            <span className="text-xs text-muted-foreground font-mono">
              {isAnalyzing ? "ANALYZING" : recorder.isRecording ? "RECORDING" : "STANDBY"}
            </span>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 py-8">
        {recorder.error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            ⚠ Microphone Error: {recorder.error}. Please allow microphone access and reload.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Audio Signal</h2>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-bold text-foreground">{formatTime(recorder.duration)}</span>
                  <span className="text-sm text-muted-foreground font-mono">/ {formatTime(recorder.maxDuration)}</span>
                </div>
              </div>

              <WaveformVisualizer analyserNode={recorder.analyserNode} isRecording={recorder.isRecording} />

              <div className="mt-4 h-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-300 ease-linear"
                  style={{ width: `${(recorder.duration / recorder.maxDuration) * 100}%` }} />
              </div>

              <div className="flex items-center justify-center gap-4 mt-6">
                {!recorder.isRecording && !isAnalyzing ? (
                  <button onClick={recorder.startRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity glow-primary">
                    <Mic className="w-4 h-4" />
                    {recorder.audioBlob ? "Record Again" : "Start Recording"}
                  </button>
                ) : recorder.isRecording ? (
                  <button onClick={recorder.stopRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-recording text-destructive-foreground font-semibold text-sm hover:opacity-90 transition-opacity glow-recording">
                    <Square className="w-4 h-4" />
                    Stop ({formatTime(remaining)})
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Processing analysis...
                  </div>
                )}
                {(recorder.audioBlob || analysisResult) && !recorder.isRecording && !isAnalyzing && (
                  <button onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground hover:border-primary/30 transition-colors">
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

            {/* Analysis summary */}
            {analysisResult && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <h3 className="text-xs uppercase tracking-widest text-primary mb-2">AI Analysis Summary</h3>
                <p className="text-sm text-foreground leading-relaxed">{analysisResult.summary}</p>
                {analysisResult.trigger_keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {analysisResult.trigger_keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-1 rounded-md bg-primary/10 text-xs font-mono text-primary">{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                title="Pitch (F₀)"
                value={showMetrics ? (analysisResult?.stress_score != null ? Math.round(liveMetrics.pitchHz) : Math.round(liveMetrics.pitchHz)) : "—"}
                unit="Hz"
                subtitle="Fundamental frequency"
                status={liveMetrics.pitchHz > 190 ? "critical" : liveMetrics.pitchHz > 150 ? "warning" : "normal"}
              />
              <MetricCard
                title="Tremor Index"
                value={showMetrics ? liveMetrics.tremorIndex.toFixed(2) : "—"}
                unit="σ"
                subtitle="Micro-tremor deviation"
                status={liveMetrics.tremorIndex > 2.5 ? "critical" : liveMetrics.tremorIndex > 1 ? "warning" : "normal"}
              />
              <MetricCard
                title="Pacing"
                value={showMetrics ? Math.round(liveMetrics.pacingSpm) : "—"}
                unit="SPM"
                subtitle="Syllables per minute"
                status={liveMetrics.pacingSpm > 230 ? "critical" : liveMetrics.pacingSpm > 210 ? "warning" : "normal"}
              />
            </div>

            <PitchChart isRecording={recorder.isRecording} analyserNode={recorder.analyserNode} />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 self-start">Composite Analysis</h2>
              <StressGauge score={Math.round(stressScore)} />
              <div className="w-full mt-6 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono text-foreground">
                    {analysisResult ? `${Math.round(analysisResult.confidence)}%` : recorder.isRecording ? "Live" : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Trigger Keywords</span>
                  <span className="font-mono text-foreground">
                    {analysisResult ? `${analysisResult.trigger_keywords.length} detected` : recorder.isRecording ? "scanning..." : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Data Quality</span>
                  <span className="font-mono text-primary">
                    {analysisResult?.fallback ? "LIMITED" : analysisResult ? "FULL" : recorder.isRecording ? "CAPTURING" : "STANDBY"}
                  </span>
                </div>
              </div>
            </div>

            <RecordingHistory onRefresh={historyRefresh} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
