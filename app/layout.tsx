import './globals.css';
import './mobile-model.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'SudoAI', description: 'AI answers. Simple. Powerful.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
