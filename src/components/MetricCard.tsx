interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  status?: "normal" | "warning" | "critical";
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, value, unit, subtitle, status = "normal", icon, className = "" }: MetricCardProps) {
  const statusColor = {
    normal: "text-primary",
    warning: "text-stress-medium",
    critical: "text-stress-high",
  }[status];

  const statusGlow = {
    normal: "",
    warning: "shadow-[0_0_15px_hsl(45_90%_55%_/_0.15)]",
    critical: "shadow-[0_0_15px_hsl(0_72%_55%_/_0.15)]",
  }[status];

  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${statusGlow} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{title}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl font-bold font-mono ${statusColor}`}>{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      )}
    </div>
  );
}
