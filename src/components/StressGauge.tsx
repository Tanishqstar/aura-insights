import { useMemo } from "react";

interface StressGaugeProps {
  score: number; // 0-100
  label?: string;
  className?: string;
}

export function StressGauge({ score, label = "Stress Score", className = "" }: StressGaugeProps) {
  const { color, level } = useMemo(() => {
    if (score < 25) return { color: "hsl(152 68% 50%)", level: "Low" };
    if (score < 50) return { color: "hsl(45 90% 55%)", level: "Moderate" };
    if (score < 75) return { color: "hsl(20 80% 55%)", level: "High" };
    return { color: "hsl(0 72% 55%)", level: "Critical" };
  }, [score]);

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference * 0.75;
  const rotation = -225;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-[0deg]">
          {/* Background arc */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="hsl(220 14% 16%)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
            transform={`rotate(${rotation} 80 80)`}
          />
          {/* Active arc */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(${rotation} 80 80)`}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold font-mono" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            {level}
          </span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground mt-2">{label}</span>
    </div>
  );
}
