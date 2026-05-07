interface Props {
  valor: string | number;
  label: string;
  sub?: string;
  delta?: number;
  color?: string;
}

export default function KpiCard({ valor, label, sub, delta, color = "#0f3460" }: Props) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm" style={{ borderTop: `3px solid ${color}` }}>
      <div className="text-3xl font-black leading-none" style={{ color }}>
        {valor}
      </div>
      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{label}</div>
      {(sub || delta !== undefined) && (
        <div className="text-xs mt-1 text-gray-400">
          {delta !== undefined && delta !== 0 && (
            <span className={delta > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}{" "}
            </span>
          )}
          {sub}
        </div>
      )}
    </div>
  );
}
