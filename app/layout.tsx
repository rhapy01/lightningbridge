import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { WalletSessionProvider } from '../components/wallet-session'

export const metadata: Metadata = {
  metadataBase: new URL('https://lightningbridge.vercel.app'),
  title: 'LightningBridge — Pay Lightning with Nimiq Pay',
  description: 'Pay Bitcoin Lightning invoices with NIM or USDT from your Nimiq Pay wallet.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'LightningBridge',
    title: 'LightningBridge — Pay Lightning with Nimiq Pay',
    description: 'Use NIM or USDT in Nimiq Pay to pay a Lightning Address or invoice.',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LightningBridge — Pay Lightning with Nimiq Pay',
    description: 'Use NIM or USDT in Nimiq Pay to pay a Lightning Address or invoice.',
    images: ['/opengraph-image'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#15221f' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletSessionProvider>{children}</WalletSessionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
