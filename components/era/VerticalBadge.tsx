import { VERTICAL_META } from "@/lib/era/verticals";
import type { Vertical } from "@/lib/era/types";

export default function VerticalBadge({ vertical }: { vertical: Vertical }) {
  const meta = VERTICAL_META[vertical];
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide"
      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
    >
      {meta.label}
    </span>
  );
}
