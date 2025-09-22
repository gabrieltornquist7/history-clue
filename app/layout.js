// app/layout.js
import "./globals.css";

export const metadata = {
  title: "HistoryClue",
  description: "Where in History am I?"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black antialiased">
        <div className="max-w-4xl mx-auto px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
