import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'f1-pitwall — F1 race replay',
  description: 'An unofficial, open-source F1 race-replay dashboard built from public data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
