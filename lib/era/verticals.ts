import type { Vertical } from "./types";

export const VERTICAL_META: Record<Vertical, { label: string; color: string; bg: string; emoji: string }> = {
  longevidad:      { label: "Longevidad",       color: "#0f3460", bg: "#e8f0fe", emoji: "🩺" },
  dolor:           { label: "Dolor",            color: "#e74c3c", bg: "#fde8e8", emoji: "⚡" },
  sueroterapia:    { label: "Sueroterapia",     color: "#1a9e5c", bg: "#e8f8f0", emoji: "💧" },
  estudios:        { label: "Estudios diag.",   color: "#2980b9", bg: "#e8f4fd", emoji: "🔬" },
  procedimientos:  { label: "Procedimientos",   color: "#6d28d9", bg: "#ede9fe", emoji: "🧫" },
  nutricion:       { label: "Nutrición",        color: "#e67e22", bg: "#fef3e2", emoji: "🥗" },
  kinesiologia:    { label: "Kinesiología",     color: "#8e44ad", bg: "#f3e8fd", emoji: "🦿" },
  estetica:        { label: "Estética",         color: "#c0392b", bg: "#fce4ec", emoji: "✨" },
};
