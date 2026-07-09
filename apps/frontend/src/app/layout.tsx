import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { registerStaticIcons } from '@/lib/icons';

if (typeof window !== 'undefined') {
  registerStaticIcons();
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
});
export const metadata: Metadata = {
  title: 'OptiDrive',
  description: 'Drive smarter with AI-powered route optimization',
  icons: {
    icon: [
      { url: '/images/logo.svg', type: 'image/svg+xml' },
      { url: '/images/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/images/logo.svg',
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body
        className={`${inter.className} ${ibmPlexMono.variable} bg-background`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
