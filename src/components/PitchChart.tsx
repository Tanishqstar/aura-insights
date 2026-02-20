import { useRef, useEffect } from "react";

interface PitchChartProps {
  isRecording: boolean;
  analyserNode: AnalyserNode | null;
  className?: string;
}

export function PitchChart({ isRecording, analyserNode, className = "" }: PitchChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>(new Array(100).fill(50));
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (isRecording && analyserNode) {
        const data = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(data);
        // Estimate pitch stability from low-frequency energy
        const lowFreqEnergy = data.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
        const normalizedPitch = Math.min(100, (lowFreqEnergy / 255) * 100 + Math.random() * 5);
        historyRef.current.push(normalizedPitch);
        historyRef.current.shift();
      }

      // Draw pitch line
      const points = historyRef.current;
      const stepX = w / (points.length - 1);

      // Fill area
      ctx.beginPath();
      ctx.moveTo(0, h);
      points.forEach((val, i) => {
        ctx.lineTo(i * stepX, h - (val / 100) * h * 0.85);
      });
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = "hsla(174, 72%, 50%, 0.08)";
      ctx.fill();

      // Line
      ctx.beginPath();
      points.forEach((val, i) => {
        const x = i * stepX;
        const y = h - (val / 100) * h * 0.85;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "hsl(174 72% 50%)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "hsl(174 72% 50%)";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isRecording, analyserNode]);

  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        Pitch Stability (F₀)
      </h3>
      <canvas ref={canvasRef} className="w-full rounded bg-waveform-bg" style={{ height: 100 }} />
    </div>
  );
}
