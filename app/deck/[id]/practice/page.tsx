'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RotateCcw, CheckCheck, Flame,
  Brain, Target, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/Navbar';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase/client';
import { isDue } from '@/lib/sm2';
import { REVIEW_RATINGS } from '@/lib/types';
import type { Card, CardProgress } from '@/lib/types';

type CardWithProg = Card & { progress?: CardProgress };
type SessionState = 'loading' | 'studying' | 'session_done' | 'all_done';

const TYPE_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  concept:      { bg: 'rgba(109,40,217,0.08)', color: '#6d28d9', border: 'rgba(109,40,217,0.18)', label: 'Concept' },
  definition:   { bg: 'rgba(37,99,235,0.08)',  color: '#2563eb', border: 'rgba(37,99,235,0.18)',  label: 'Definition' },
  example:      { bg: 'rgba(5,150,105,0.08)',  color: '#059669', border: 'rgba(5,150,105,0.18)',  label: 'Example' },
  edge_case:    { bg: 'rgba(225,29,72,0.08)',  color: '#e11d48', border: 'rgba(225,29,72,0.18)',  label: 'Edge Case' },
  relationship: { bg: 'rgba(217,119,6,0.08)',  color: '#d97706', border: 'rgba(217,119,6,0.18)',  label: 'Relationship' },
};

const RATINGS = [
  { value: 0 as const, label: 'Again', emoji: '😵', bg: 'rgba(225,29,72,0.08)',  border: 'rgba(225,29,72,0.2)',  color: '#e11d48', hover: 'rgba(225,29,72,0.14)' },
  { value: 3 as const, label: 'Hard',  emoji: '😐', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)', color: '#d97706', hover: 'rgba(217,119,6,0.14)' },
  { value: 4 as const, label: 'Good',  emoji: '🙂', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', color: '#2563eb', hover: 'rgba(37,99,235,0.14)' },
  { value: 5 as const, label: 'Easy',  emoji: '🚀', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)', color: '#059669', hover: 'rgba(5,150,105,0.14)' },
];

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = useSession();

  const [deckTitle, setDeckTitle]       = useState('');
  const [queue, setQueue]               = useState<CardWithProg[]>([]);
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [isFlipped, setIsFlipped]       = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [stats, setStats]               = useState({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0, streak: 0, maxStreak: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const loadQueue = useCallback(async () => {
    if (!sessionId || !id) return;
    setSessionState('loading');

    const { data: deck } = await supabase.from('decks').select('title, card_count').eq('id', id).single();
    if (!deck) { router.push('/dashboard'); return; }
    setDeckTitle(deck.title);

    const { data: cards } = await supabase.from('cards').select('*').eq('deck_id', id);
    if (!cards || cards.length === 0) { setSessionState('all_done'); return; }

    const { data: progress } = await supabase.from('card_progress').select('*')
      .eq('session_id', sessionId).in('card_id', cards.map((c) => c.id));

    const progMap = new Map<string, CardProgress>(progress?.map((p) => [p.card_id, p]) || []);
    const withProg = cards.map((c) => ({ ...c, progress: progMap.get(c.id) }));
    const due = withProg
      .filter((c) => !c.progress || isDue(c.progress.due_at))
      .sort((a, b) => {
        if (!a.progress && b.progress) return -1;
        if (a.progress && !b.progress) return 1;
        if (!a.progress || !b.progress) return 0;
        return new Date(a.progress.due_at).getTime() - new Date(b.progress.due_at).getTime();
      });

    if (due.length === 0) { setSessionState('all_done'); return; }
    setQueue(due); setCurrentIdx(0); setIsFlipped(false);
    setSessionState('studying');
  }, [sessionId, id, router]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const handleRate = async (rating: 0 | 3 | 4 | 5) => {
    if (!sessionId || isSubmitting || currentIdx >= queue.length) return;
    const card = queue[currentIdx];
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/review-card', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: card.id, session_id: sessionId, rating }),
      });
      if (!res.ok) throw new Error();

      setStats((prev) => {
        const newStreak = rating >= 4 ? prev.streak + 1 : 0;
        const newMax = Math.max(prev.maxStreak, newStreak);
        if (newStreak >= 3) toast.success(`🔥 ${newStreak} streak!`, { id: 'streak', duration: 1500 });
        return { ...prev, reviewed: prev.reviewed + 1,
          again: prev.again + (rating === 0 ? 1 : 0), hard: prev.hard + (rating === 3 ? 1 : 0),
          good: prev.good + (rating === 4 ? 1 : 0), easy: prev.easy + (rating === 5 ? 1 : 0),
          streak: newStreak, maxStreak: newMax };
      });

      const next = currentIdx + 1;
      if (next >= queue.length) setSessionState('session_done');
      else { setCurrentIdx(next); setIsFlipped(false); }
    } catch { toast.error('Failed to save review. Try again.'); }
    finally { setIsSubmitting(false); }
  };

  const card = queue[currentIdx];
  const progressPct = queue.length > 0 ? (currentIdx / queue.length) * 100 : 0;
  const ts = card ? (TYPE_STYLES[card.card_type] || TYPE_STYLES.concept) : TYPE_STYLES.concept;

  /* Loading */
  if (sessionState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f7' }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(109,40,217,0.2)', borderTopColor: '#6d28d9' }} />
      </div>
    );
  }

  /* All done */
  if (sessionState === 'all_done') {
    return (
      <div className="min-h-screen" style={{ background: '#f5f5f7' }}>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full glass rounded-3xl p-8 sm:p-10 text-center"
            style={{ border: '1px solid rgba(5,150,105,0.2)', boxShadow: '0 12px 40px rgba(5,150,105,0.1)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
              <CheckCheck className="w-8 h-8" style={{ color: '#059669' }} />
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#111118' }}>
              All caught up!
            </h2>
            <p className="text-sm mb-7" style={{ color: '#4a4a6a' }}>
              No cards are due right now. Come back later for your next session.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link href={`/deck/${id}`} className="btn-ghost !text-sm !py-2.5 !px-5 !rounded-xl">View Deck</Link>
              <Link href="/dashboard" className="btn-primary !text-sm !py-2.5 !px-5 !rounded-xl">
                Dashboard <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* Session done */
  if (sessionState === 'session_done') {
    const accuracy = stats.reviewed > 0
      ? Math.round(((stats.good + stats.easy) / stats.reviewed) * 100) : 0;
    const emoji = accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '💪';

    return (
      <div className="min-h-screen" style={{ background: '#f5f5f7' }}>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-5 sm:px-8 pt-16">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full glass rounded-3xl p-8 sm:p-10 text-center"
            style={{ border: '1px solid rgba(109,40,217,0.15)', boxShadow: '0 12px 48px rgba(109,40,217,0.1)' }}>
            <div className="text-5xl mb-4">{emoji}</div>
            <h2 className="text-2xl font-black mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#111118' }}>
              Session Complete!
            </h2>
            <p className="text-sm mb-7" style={{ color: '#4a4a6a' }}>
              {deckTitle} · {stats.reviewed} cards reviewed
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-2xl p-5"
                style={{ background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.18)' }}>
                <div className="text-3xl font-black mb-0.5" style={{ color: '#059669' }}>{accuracy}%</div>
                <div className="text-xs" style={{ color: '#9090aa' }}>Accuracy</div>
              </div>
              <div className="rounded-2xl p-5"
                style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.18)' }}>
                <div className="text-3xl font-black flex items-center justify-center gap-1.5 mb-0.5" style={{ color: '#d97706' }}>
                  <Flame className="w-6 h-6" />{stats.maxStreak}
                </div>
                <div className="text-xs" style={{ color: '#9090aa' }}>Best Streak</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-7">
              {[
                { l: 'Again', v: stats.again, c: '#e11d48' },
                { l: 'Hard',  v: stats.hard,  c: '#d97706' },
                { l: 'Good',  v: stats.good,  c: '#2563eb' },
                { l: 'Easy',  v: stats.easy,  c: '#059669' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl p-3 text-center"
                  style={{ background: '#f8f8fc', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <div className="text-xl font-bold" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-xs" style={{ color: '#9090aa' }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
              <button
                onClick={() => { setStats({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0, streak: 0, maxStreak: 0 }); loadQueue(); }}
                className="btn-ghost !text-sm !py-2.5 !px-4 !rounded-xl flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" /> Study Again
              </button>
              <Link href={`/deck/${id}`} className="btn-ghost !text-sm !py-2.5 !px-4 !rounded-xl">View Deck</Link>
              <Link href="/dashboard" className="btn-primary !text-sm !py-2.5 !px-4 !rounded-xl">Dashboard</Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* Studying */
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f5f5f7' }}>
      <Navbar />

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-5 sm:px-8 pt-20 pb-8">

        {/* Progress header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <Link href={`/deck/${id}`}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: '#9090aa' }}>
              <ArrowLeft className="w-4 h-4" />
              <span className="line-clamp-1 max-w-[180px] sm:max-w-xs">{deckTitle}</span>
            </Link>
            <div className="flex items-center gap-3">
              {stats.streak >= 2 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-xs font-bold" style={{ color: '#d97706' }}>
                  <Flame className="w-3.5 h-3.5" /> {stats.streak}
                </motion.span>
              )}
              <span className="text-sm font-medium tabular-nums" style={{ color: '#9090aa' }}>
                {currentIdx + 1} / {queue.length}
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
            <motion.div className="h-full rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
              style={{ background: 'linear-gradient(90deg, #6d28d9, #2563eb)' }} />
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div key={card.id}
              initial={{ opacity: 0, x: 24, scale: 0.99 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-xl">

              {/* Type badge */}
              <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
                  <Brain className="w-3 h-3" /> {ts.label}
                </span>
                {card.tags?.slice(0, 2).map((tag) => (
                  <span key={tag} className="tag-pill">{tag}</span>
                ))}
              </div>

              {/* 3D flip card */}
              <div className="card-scene w-full mb-4"
                style={{ height: 'clamp(220px, 38vw, 300px)' }}
                onClick={() => !isFlipped && setIsFlipped(true)}>
                <div className={`card-inner w-full h-full ${isFlipped ? 'flipped' : ''}`}>

                  {/* Front */}
                  <div className="card-face glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative"
                    style={{ border: '1px solid rgba(0,0,0,0.09)', boxShadow: 'var(--shadow-md)' }}>
                    <p className="section-label mb-4">Question</p>
                    <p className="text-base sm:text-lg font-semibold text-center leading-relaxed" style={{ color: '#111118' }}>
                      {card.front}
                    </p>
                    {!isFlipped && (
                      <p className="absolute bottom-5 text-xs" style={{ color: '#9090aa' }}>
                        Tap to reveal answer
                      </p>
                    )}
                  </div>

                  {/* Back */}
                  <div className="card-face back rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center"
                    style={{
                      background: '#fff',
                      border: `1.5px solid ${ts.border}`,
                      boxShadow: `var(--shadow-md), 0 0 24px ${ts.bg}`,
                    }}>
                    <p className="section-label mb-4" style={{ color: ts.color }}>Answer</p>
                    <p className="text-sm sm:text-base text-center leading-relaxed overflow-y-auto max-h-44"
                      style={{ color: '#4a4a6a' }}>
                      {card.back}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating buttons / Show answer */}
              <AnimatePresence>
                {isFlipped ? (
                  <motion.div key="ratings"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="grid grid-cols-4 gap-2 sm:gap-3">
                    {RATINGS.map((r) => (
                      <motion.button key={r.value}
                        onClick={() => handleRate(r.value)}
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        onMouseEnter={() => setHoveredRating(r.value)}
                        onMouseLeave={() => setHoveredRating(null)}
                        className="flex flex-col items-center gap-1.5 py-3 sm:py-4 px-1 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all disabled:opacity-50"
                        style={{
                          background: hoveredRating === r.value ? r.hover : r.bg,
                          border: `1px solid ${r.border}`,
                          color: r.color,
                        }}>
                        <span className="text-xl sm:text-2xl">{r.emoji}</span>
                        <span>{r.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.button key="show"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsFlipped(true)}
                    className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all"
                    style={{
                      background: 'rgba(109,40,217,0.09)',
                      border: '1px solid rgba(109,40,217,0.2)',
                      color: '#6d28d9',
                    }}
                    whileHover={{ background: 'rgba(109,40,217,0.14)' }}>
                    Show Answer
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mini stats footer */}
        <div className="mt-5 flex justify-center gap-5 text-sm">
          {[
            { v: stats.again, c: '#e11d48', e: '😵' },
            { v: stats.hard,  c: '#d97706', e: '😐' },
            { v: stats.good,  c: '#2563eb', e: '🙂' },
            { v: stats.easy,  c: '#059669', e: '🚀' },
          ].map((s, i) => (
            <span key={i} style={{ color: s.v > 0 ? s.c : '#9090aa' }}>{s.e} {s.v}</span>
          ))}
          <span className="flex items-center gap-1" style={{ color: '#9090aa' }}>
            <Target className="w-3.5 h-3.5" />{stats.reviewed}
          </span>
        </div>
      </main>
    </div>
  );
}
