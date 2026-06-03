import type { Metadata, Viewport } from "next";
import { Outfit, Roboto } from "next/font/google";
import "./globals.css";

// Outfit = fallback web de Avenir LT (display / títulos), geométrica humanista.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Roboto = tipografía de lectura / cuerpo según el manual de marca ERA.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ERA Longevity — Dashboard",
  description: "Dashboard interno de gestión de consultorio",
  applicationName: "ERA Longevity",
  appleWebApp: {
    capable: true,
    title: "ERA",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9F6EB" },
    { media: "(prefers-color-scheme: dark)", color: "#232E49" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${roboto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
