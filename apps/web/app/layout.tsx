import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'f1-pitwall — F1 race replay & predictions',
  description:
    'An unofficial, open-source F1 race-replay dashboard and prediction sandbox built from public data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
