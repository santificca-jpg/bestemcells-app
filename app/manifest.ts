import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ERA Longevity — Dashboard",
    short_name: "ERA",
    description: "Dashboard interno de gestión clínica ERA Longevity",
    start_url: "/era",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#2C3A5B",
    theme_color: "#2C3A5B",
    lang: "es-AR",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
