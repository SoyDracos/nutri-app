import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NutriGenius AI',
  description: 'Tu nutricionista personal inteligente',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
