import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BestEmCells — Plataforma Educativa Médica',
  description: 'Plataforma de educación médica continua para profesionales de la salud.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
