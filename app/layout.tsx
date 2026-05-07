import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERA Longevity — Dashboard",
  description: "Dashboard interno de gestión de consultorio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
