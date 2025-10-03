// app/layout.js
import { Inter, Playfair_Display } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { Providers } from '../components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata = {
  metadataBase: new URL('https://historyclue.com'),
  title: {
    default: 'HistoryClue - Master History Through Interactive Geography Puzzles',
    template: '%s | HistoryClue'
  },
  description: 'Test your historical knowledge with HistoryClue! Deduce cities and years from five fascinating clues. Play daily challenges, compete in live battles, and explore history through an engaging geography game. Free online history trivia game.',
  keywords: [
    'history game',
    'geography quiz',
    'history trivia',
    'educational game',
    'historical facts',
    'city guessing game',
    'world history quiz',
    'geography trivia',
    'history puzzle',
    'daily challenge',
    'multiplayer history game',
    'online trivia',
    'learn history',
    'history facts game',
    'geography learning',
    'historical events',
    'world geography game',
    'history education',
    'interactive history',
    'historical knowledge test'
  ],
  authors: [{ name: 'Viii Wonder Development' }],
  creator: 'Viii Wonder Development',
  publisher: 'HistoryClue',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://historyclue.com',
    siteName: 'HistoryClue',
    title: 'HistoryClue - Master History Through Interactive Geography Puzzles',
    description: 'Test your historical knowledge with HistoryClue! Deduce cities and years from five fascinating clues. Play daily challenges, compete in live battles, and explore endless history puzzles.',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'HistoryClue - Interactive History & Geography Game',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HistoryClue - Master History Through Interactive Geography Puzzles',
    description: 'Test your historical knowledge! Deduce cities and years from five clues. Play daily challenges and compete in live battles.',
    images: ['/logo.png'],
    creator: '@historyclue',
    site: '@historyclue',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HistoryClue',
  },
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  themeColor: '#0a0a0a',
  category: 'education',
  alternates: {
    canonical: 'https://historyclue.com',
  },
  verification: {
    google: 'ZeriLe4jOE10_ExuXhzlBXc8JFZS3SVGJO_h4HdpC_M',
    // Add other verification codes here when you have them:
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "HistoryClue",
              "applicationCategory": "GameApplication",
              "genre": ["Educational", "Trivia", "Geography"],
              "description": "Interactive history and geography trivia game where players deduce cities and years from five historical clues. Features daily challenges, live multiplayer battles, and endless mode.",
              "url": "https://historyclue.com",
              "operatingSystem": "Web Browser, iOS, Android",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1250"
              },
              "creator": {
                "@type": "Organization",
                "name": "Viii Wonder Development",
                "url": "https://historyclue.com"
              },
              "featureList": [
                "Daily historical challenges",
                "Live multiplayer battles",
                "Endless mode with progressive difficulty",
                "Global leaderboards",
                "Educational historical facts",
                "Geography-based puzzles",
                "Achievement system",
                "Free to play"
              ]
            })
          }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
