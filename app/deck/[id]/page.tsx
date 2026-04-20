'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Layers, Tag, ChevronDown,
  BookOpen, Zap, Star, Clock, LayoutGrid,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase/client';
import { getMasteryLabel } from '@/lib/sm2';
import type { Deck, Card, CardProgress } from '@/lib/types';

type CardWithProg = Card & { progress?: CardProgress };

const TYPE_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  concept:      { bg: 'rgba(109,40,217,0.08)', color: '#6d28d9', border: 'rgba(109,40,217,0.15)', label: 'Concept' },
  definition:   { bg: 'rgba(37,99,235,0.08)',  color: '#2563eb', border: 'rgba(37,99,235,0.15)',  label: 'Definition' },
  example:      { bg: 'rgba(5,150,105,0.08)',  color: '#059669', border: 'rgba(5,150,105,0.15)',  label: 'Example' },
  edge_case:    { bg: 'rgba(225,29,72,0.08)',  color: '#e11d48', border: 'rgba(225,29,72,0.15)',  label: 'Edge Case' },
  relationship: { bg: 'rgba(217,119,6,0.08)',  color: '#d97706', border: 'rgba(217,119,6,0.15)',  label: 'Relationship' },
};

const MASTERY_CSS: Record<string, string> = {
  new: 'badge-new', learning: 'badge-learning', review: 'badge-review', mastered: 'badge-mastered',
};

function CardSkeleton() {
  return (
    <div className="rounded-xl py-3.5 px-5 flex items-center gap-3"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
      <div className="skeleton h-4 w-4 rounded-full flex-shrink-0" />
      <div className="skeleton h-3.5 flex-1 rounded-lg" />
      <div className="skeleton h-5 w-20 rounded-full" />
    </div>
  );
}

export default function DeckPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = useSession();

  const [deck, setDeck]         = useState<Deck | null>(null);
  const [cards, setCards]       = useState<CardWithProg[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter]     = useState('all');

  useEffect(() => {
    if (!sessionId || !id) return;
    async function load() {
      const [deckRes, cardsRes] = await Promise.all([
        supabase.from('decks').select('*').eq('id', id).single(),
        supabase.from('cards').select('*').eq('deck_id', id).order('created_at'),
      ]);
      if (deckRes.error || !deckRes.data) { router.push('/dashboard'); return; }
      setDeck(deckRes.data);
      const raw: Card[] = cardsRes.data || [];
      const { data: prog } = await supabase.from('card_progress').select('*')
        .eq('session_id', sessionId).in('card_id', raw.map((c) => c.id));
      const progMap = new Map<string, CardProgress>(prog?.map((p) => [p.card_id, p]) || []);
      setCards(raw.map((c) => ({ ...c, progress: progMap.get(c.id) })));
      setLoading(false);
    }
    load();
  }, [sessionId, id, router]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#f5f5f7' }}>
        <Navbar />
        <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-24 pb-16 space-y-4">
          <div className="skeleton h-7 w-56 rounded-xl mb-6" />
          <div className="skeleton h-40 w-full rounded-2xl" />
          <div className="space-y-2 mt-6">
            {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </main>
      </div>
    );
  }
  if (!deck) return null;

  const stats = {
    new:      cards.filter((c) => !c.progress).length,
    learning: cards.filter((c) => c.progress && getMasteryLabel(c.progress.interval_days) === 'learning').length,
    review:   cards.filter((c) => c.progress && getMasteryLabel(c.progress.interval_days) === 'review').length,
    mastered: cards.filter((c) => c.progress && getMasteryLabel(c.progress.interval_days) === 'mastered').length,
    due:      cards.filter((c) => !c.progress || new Date(c.progress.due_at) <= new Date()).length,
  };
  const masteryPct = deck.card_count > 0 ? Math.round((stats.mastered / deck.card_count) * 100) : 0;

  const FILTERS = [
    { key: 'all',      label: `All (${cards.length})` },
    { key: 'new',      label: `New (${stats.new})` },
    { key: 'learning', label: `Learning (${stats.learning})` },
    { key: 'review',   label: `Review (${stats.review})` },
    { key: 'mastered', label: `Mastered (${stats.mastered})` },
  ];

  const filteredCards = filter === 'all' ? cards
    : cards.filter((c) => (c.progress ? getMasteryLabel(c.progress.interval_days) : 'new') === filter);

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f7' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-24 pb-16">

        <Link href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: '#9090aa' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#111118'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#9090aa'; }}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Deck header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-1"
                style={{ fontFamily: 'Outfit, sans-serif', color: '#111118' }}>
                {deck.title}
              </h1>
              <p className="text-sm" style={{ color: '#9090aa' }}>
                {deck.card_count} cards{deck.pdf_name ? ` · ${deck.pdf_name}` : ''}
              </p>
            </div>
            <Link href={`/deck/${id}/practice`} className="btn-primary !text-sm !py-2.5 !px-5 !rounded-xl flex-shrink-0">
              <Play className="w-4 h-4" /> Study Now
            </Link>
          </div>

          {/* mastery bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color: '#9090aa' }}>Overall Mastery</span>
              <span className="font-bold" style={{ color: '#059669' }}>{masteryPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex gap-px" style={{ background: 'rgba(0,0,0,0.07)' }}>
              {[
                { w: stats.new,      color: '#94a3b8' },
                { w: stats.learning, color: '#f59e0b' },
                { w: stats.review,   color: '#3b82f6' },
                { w: stats.mastered, color: '#10b981' },
              ].map((seg, i) => (
                <motion.div key={i} className="h-full rounded-sm"
                  initial={{ width: 0 }}
                  animate={{ width: deck.card_count > 0 ? `${(seg.w / deck.card_count) * 100}%` : '0%' }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
                  style={{ background: seg.color, minWidth: seg.w > 0 ? '4px' : '0' }}
                />
              ))}
            </div>
          </div>

          {/* badges */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'New',      value: stats.new,      icon: Layers, css: 'badge-new' },
              { label: 'Learning', value: stats.learning, icon: Zap,    css: 'badge-learning' },
              { label: 'Review',   value: stats.review,   icon: Clock,  css: 'badge-review' },
              { label: 'Mastered', value: stats.mastered, icon: Star,   css: 'badge-mastered' },
            ].map((s) => (
              <span key={s.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${s.css}`}>
                <s.icon className="w-3.5 h-3.5" /> {s.value} {s.label}
              </span>
            ))}
            {stats.due > 0 && (
              <Link href={`/deck/${id}/practice`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(109,40,217,0.09)', color: '#6d28d9', border: '1px solid rgba(109,40,217,0.18)' }}>
                <Play className="w-3 h-3" /> {stats.due} due now
              </Link>
            )}
          </div>
        </motion.div>

        {/* Card list header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: '#111118' }}>
            <BookOpen className="w-4 h-4" style={{ color: '#6d28d9' }} />
            All Cards ({cards.length})
          </h2>
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: filter === f.key ? 'rgba(109,40,217,0.1)' : '#fff',
                  color: filter === f.key ? '#6d28d9' : '#4a4a6a',
                  border: filter === f.key ? '1px solid rgba(109,40,217,0.2)' : '1px solid rgba(0,0,0,0.08)',
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {filteredCards.map((card, i) => {
              const mastery = card.progress ? getMasteryLabel(card.progress.interval_days) : 'new';
              const ts = TYPE_STYLES[card.card_type] || TYPE_STYLES.concept;
              const isOpen = expanded === card.id;

              return (
                <motion.div key={card.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.025, 0.25) }}
                  className="rounded-xl overflow-hidden"
                  style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: 'var(--shadow-sm)' }}>

                  <button onClick={() => setExpanded(isOpen ? null : card.id)}
                    className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left transition-colors"
                    style={{ background: isOpen ? '#fafaff' : undefined }}>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      style={{ color: '#9090aa' }} />
                    <span className="flex-1 text-sm font-medium line-clamp-1" style={{ color: '#111118' }}>
                      {card.front}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`hidden sm:inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium`}
                        style={{ background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
                        {ts.label}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${MASTERY_CSS[mastery]}`}>
                        {mastery}
                      </span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden">
                        <div className="px-5 pb-5 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          <div className="grid sm:grid-cols-2 gap-5">
                            <div>
                              <p className="section-label mb-2">Question</p>
                              <p className="text-sm leading-relaxed" style={{ color: '#111118' }}>{card.front}</p>
                            </div>
                            <div>
                              <p className="section-label mb-2">Answer</p>
                              <p className="text-sm leading-relaxed" style={{ color: '#4a4a6a' }}>{card.back}</p>
                            </div>
                          </div>
                          {card.tags?.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                              <Tag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9090aa' }} />
                              {card.tags.map((t) => <span key={t} className="tag-pill">{t}</span>)}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredCards.length === 0 && (
            <div className="text-center py-16" style={{ color: '#9090aa' }}>
              <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No cards in this category yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
