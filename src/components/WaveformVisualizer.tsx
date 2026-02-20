import { useRef, useEffect } from "react";

interface WaveformVisualizerProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  className?: string;
}

export function WaveformVisualizer({ analyserNode, isRecording, className = "" }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

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
    window.addEventListener("resize", resize);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = "hsl(220 14% 15%)";
      ctx.lineWidth = 0.5;
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Center line
      ctx.strokeStyle = "hsl(220 14% 20%)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      if (analyserNode && isRecording) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        // Glow effect
        ctx.shadowColor = "hsl(174 72% 50%)";
        ctx.shadowBlur = 12;

        // Waveform
        ctx.strokeStyle = "hsl(174 72% 55%)";
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = w / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }

        ctx.lineTo(w, h / 2);
        ctx.stroke();

        // Frequency bars (bottom)
        const freqData = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(freqData);

        ctx.shadowBlur = 0;
        const barCount = 64;
        const barWidth = w / barCount;
        const step = Math.floor(freqData.length / barCount);

        for (let i = 0; i < barCount; i++) {
          const value = freqData[i * step] / 255;
          const barHeight = value * h * 0.3;

          const hue = 174 - value * 174;
          ctx.fillStyle = `hsla(${hue}, 72%, 50%, 0.3)`;
          ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
        }
      } else {
        // Idle state - flat line with subtle noise
        ctx.strokeStyle = "hsl(174 72% 50% / 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const noise = Math.sin(x * 0.02 + Date.now() * 0.001) * 2;
          ctx.lineTo(x, h / 2 + noise);
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [analyserNode, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-lg bg-waveform-bg ${className}`}
      style={{ height: 180 }}
    />
  );
}
