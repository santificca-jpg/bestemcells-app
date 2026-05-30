import type { Vertical } from "./types";

// Paleta de verticales armonizada con la marca ERA: tonos apagados / premium,
// que conviven con el navy y el dorado sin "gritar". Longevidad usa el azul
// primario de marca (Blue Cyan). El resto son versiones desaturadas y elegantes.
export const VERTICAL_META: Record<Vertical, { label: string; color: string; bg: string; emoji: string }> = {
  longevidad:      { label: "Longevidad",       color: "#3E4095", bg: "#ECEDF7", emoji: "🩺" },
  dolor:           { label: "Dolor",            color: "#B5654A", bg: "#F5ECE8", emoji: "⚡" },
  sueroterapia:    { label: "Sueroterapia",     color: "#3E8B86", bg: "#E8F2F1", emoji: "💧" },
  estudios:        { label: "Estudios diag.",   color: "#5A77A8", bg: "#ECF0F7", emoji: "🔬" },
  procedimientos:  { label: "Procedimientos",   color: "#7A5C9E", bg: "#F0EBF6", emoji: "🧫" },
  nutricion:       { label: "Nutrición",        color: "#BE8C3E", bg: "#F6EFDF", emoji: "🥗" },
  kinesiologia:    { label: "Kinesiología",     color: "#5E8C6A", bg: "#EAF2EC", emoji: "🦿" },
  estetica:        { label: "Estética",         color: "#B07088", bg: "#F5ECF0", emoji: "✨" },
};
