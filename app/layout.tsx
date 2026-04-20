import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlashMind — AI Flashcard Engine',
  description:
    'Transform any PDF into smart flashcards powered by AI. Study smarter with spaced repetition and active recall.',
  keywords: 'flashcards, spaced repetition, AI study, PDF to flashcards, active recall',
  openGraph: {
    title: 'FlashMind — AI Flashcard Engine',
    description: 'Transform any PDF into smart flashcards powered by AI.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="glow-bg">
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#111118',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            },
            success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#e11d48', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
