import './globals.css';
import './mobile-model.css';
import type { Metadata } from 'next';
import FileAttach from './FileAttach';
import AuthEnhancements from './AuthEnhancements';
import UpgradeEnhancements from './UpgradeEnhancements';

export const metadata: Metadata = { title: 'SudoAI', description: 'AI answers. Simple. Powerful.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<FileAttach /><AuthEnhancements /><UpgradeEnhancements /></body></html>;
}
