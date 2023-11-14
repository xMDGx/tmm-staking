import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Wallet } from '@/components/Wallet'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TrickMyMind UI Testing',
  description: 'Frontend for TrickMyMind Solana Program UI Testing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Wallet>
          {children}
        </Wallet>
      </body>
    </html>
  )
}
