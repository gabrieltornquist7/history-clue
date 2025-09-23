// app/layout.js
import { Inter, Playfair_Display } from 'next/font/google';
import 'leaflet/dist/leaflet.css'; // <-- ADD THIS LINE
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata = {
  title: 'HistoryClue',
  description: 'Deduce the city and year from five clues.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}