import type { Metadata, Viewport } from 'next';
import '../design/tokens.css';
import 'katex/dist/katex.min.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Riddler: three math riddles a day',
  description: 'Three math riddles a day, same for everyone. Each one has a trap. The closer your answer, the higher you climb.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D1122',
};

// Applies the saved theme before paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem('burner_theme');if(t==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* tokens.css @imports these too, but bundling inlines that file so the @import is dropped. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
