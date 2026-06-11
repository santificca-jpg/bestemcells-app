interface Props {
  valor: string | number;
  label: string;
  sub?: string;
  delta?: number;
  color?: string;
}

export default function KpiCard({ valor, label, sub, delta, color = "#2C3A5B" }: Props) {
  return (
    <div className="bg-[color:var(--bg-card)] rounded-xl px-4 py-4 shadow-card border border-[color:var(--border-soft)] hover:shadow-card-hover transition-shadow">
      {/* Acento superior fino de marca */}
      <div className="h-0.5 w-8 rounded-full mb-3" style={{ background: color }} />
      <div className="text-[28px] leading-none font-display font-semibold" style={{ color }}>
        {valor}
      </div>
      <div className="text-[11px] text-[color:var(--text-muted)] mt-2 uppercase tracking-[0.08em] font-medium">
        {label}
      </div>
      {(sub || delta !== undefined) && (
        <div className="text-[11px] mt-1 text-[color:var(--text-muted)]">
          {delta !== undefined && delta !== 0 && (
            <span
              className="font-semibold mr-1"
              style={{ color: delta > 0 ? "var(--signal-up)" : "var(--signal-down)" }}
            >
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
            </span>
          )}
          {sub}
        </div>
      )}
    </div>
  );
}
