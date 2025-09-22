import "./globals.css";

export const metadata = { title: "HistoryClue" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--hc-bg)] text-[var(--hc-ink)]">
        {children}
      </body>
    </html>
  );
}
