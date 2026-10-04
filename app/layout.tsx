import type { Metadata, Viewport } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';
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

// Served from our own domain (next/font downloads them at build), so no request goes to Google.
const pixel = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-pixel-face' });
const body = VT323({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-body-face' });

// Applies the saved theme before paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem('burner_theme');if(t==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
