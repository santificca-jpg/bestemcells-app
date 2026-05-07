import { VERTICAL_META } from "@/lib/era/verticals";
import type { Vertical } from "@/lib/era/types";

export default function VerticalBadge({ vertical }: { vertical: Vertical }) {
  const meta = VERTICAL_META[vertical];
  return (
    <span
      className="text-xs font-bold px-1.5 py-0.5 rounded"
      style={{ background: meta.color, color: "white" }}
    >
      {meta.label.toUpperCase().slice(0, 6)}
    </span>
  );
}
