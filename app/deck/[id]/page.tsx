'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Layers, Tag, ChevronDown,
  BookOpen, Zap, Star, Clock, LayoutGrid, Trash2, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
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

/* ── Layout wrapper — same centred column as every other page ── */
const MAIN: React.CSSProperties = {
  width: '100%',
  maxWidth: 860,
  margin: '0 auto',
  padding: '88px 24px 64px',
};

export default function DeckPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = useSession();

  const [deck, setDeck]         = useState<Deck | null>(null);
  const [cards, setCards]       = useState<CardWithProg[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter]     = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!sessionId || !deck) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/decks?id=${id}&session_id=${sessionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(`"${deck.title}" deleted`);
      router.push('/dashboard');
    } catch {
      toast.error('Could not delete deck. Try again.');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

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

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7' }}>
        <Navbar />
        <main style={MAIN}>
          <div className="skeleton" style={{ height: 28, width: 220, borderRadius: 12, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 160, width: '100%', borderRadius: 20, marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 20px', background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton" style={{ height: 14, flex: 1, borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 22, width: 72, borderRadius: 999 }} />
              </div>
            ))}
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
    <div style={{ minHeight: '100vh', background: '#f5f5f7' }}>
      <Navbar />
      <main style={MAIN}>

        {/* Back link */}
        <Link href="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: '#9090aa', textDecoration: 'none',
          marginBottom: 20, transition: 'color 0.18s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#111118'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#9090aa'; }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Dashboard
        </Link>

        {/* ── Deck header card ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#fff', borderRadius: 22, padding: '28px 28px 24px',
            border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
            marginBottom: 24,
          }}>

          {/* Title + action buttons */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 26, color: '#111118', marginBottom: 4 }}>
                {deck.title}
              </h1>
              <p style={{ fontSize: 13, color: '#9090aa' }}>
                {deck.card_count} cards{deck.pdf_name ? ` · ${deck.pdf_name}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', borderRadius: 14, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', background: 'rgba(225,29,72,0.07)',
                  border: '1px solid rgba(225,29,72,0.18)', color: '#e11d48',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(225,29,72,0.13)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(225,29,72,0.07)'; }}>
                <Trash2 style={{ width: 14, height: 14 }} /> Delete
              </button>
              <Link href={`/deck/${id}/practice`} className="btn-primary" style={{ fontSize: 14, padding: '9px 20px', borderRadius: 14 }}>
                <Play style={{ width: 15, height: 15 }} /> Study Now
              </Link>
            </div>
          </div>

          {/* Mastery bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7 }}>
              <span style={{ color: '#9090aa' }}>Overall Mastery</span>
              <span style={{ fontWeight: 700, color: '#059669' }}>{masteryPct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(0,0,0,0.07)', display: 'flex', gap: 2 }}>
              {[
                { w: stats.new,      color: '#94a3b8' },
                { w: stats.learning, color: '#f59e0b' },
                { w: stats.review,   color: '#3b82f6' },
                { w: stats.mastered, color: '#10b981' },
              ].map((seg, i) => (
                <motion.div key={i}
                  initial={{ width: 0 }} animate={{ width: deck.card_count > 0 ? `${(seg.w / deck.card_count) * 100}%` : '0%' }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
                  style={{ height: '100%', borderRadius: 4, background: seg.color, minWidth: seg.w > 0 ? 4 : 0 }} />
              ))}
            </div>
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'New',      value: stats.new,      icon: Layers, css: 'badge-new' },
              { label: 'Learning', value: stats.learning, icon: Zap,    css: 'badge-learning' },
              { label: 'Review',   value: stats.review,   icon: Clock,  css: 'badge-review' },
              { label: 'Mastered', value: stats.mastered, icon: Star,   css: 'badge-mastered' },
            ].map((s) => (
              <span key={s.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${s.css}`}>
                <s.icon style={{ width: 13, height: 13 }} /> {s.value} {s.label}
              </span>
            ))}
            {stats.due > 0 && (
              <Link href={`/deck/${id}/practice`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: 'rgba(109,40,217,0.09)', color: '#6d28d9', border: '1px solid rgba(109,40,217,0.18)',
                textDecoration: 'none',
              }}>
                <Play style={{ width: 11, height: 11 }} /> {stats.due} due now
              </Link>
            )}
          </div>
        </motion.div>

        {/* ── Card list header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: '#111118', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen style={{ width: 15, height: 15, color: '#6d28d9' }} />
            All Cards ({cards.length})
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 12, cursor: 'pointer',
                background: filter === f.key ? 'rgba(109,40,217,0.1)' : '#fff',
                color:      filter === f.key ? '#6d28d9' : '#4a4a6a',
                border:     filter === f.key ? '1px solid rgba(109,40,217,0.2)' : '1px solid rgba(0,0,0,0.08)',
                transition: 'all 0.15s',
              }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {filteredCards.map((card, i) => {
              const mastery = card.progress ? getMasteryLabel(card.progress.interval_days) : 'new';
              const ts = TYPE_STYLES[card.card_type] || TYPE_STYLES.concept;
              const isOpen = expanded === card.id;

              return (
                <motion.div key={card.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.025, 0.25) }}
                  style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

                  <button onClick={() => setExpanded(isOpen ? null : card.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 18px', textAlign: 'left', cursor: 'pointer',
                      background: isOpen ? '#fafaff' : '#fff', border: 'none', transition: 'background 0.15s',
                    }}>
                    <ChevronDown style={{
                      width: 15, height: 15, flexShrink: 0, color: '#9090aa',
                      transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
                    }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#111118', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {card.front}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 600, background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
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
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                        style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                            <div>
                              <p className="section-label" style={{ marginBottom: 8 }}>Question</p>
                              <p style={{ fontSize: 13, lineHeight: 1.65, color: '#111118' }}>{card.front}</p>
                            </div>
                            <div>
                              <p className="section-label" style={{ marginBottom: 8 }}>Answer</p>
                              <p style={{ fontSize: 13, lineHeight: 1.65, color: '#4a4a6a' }}>{card.back}</p>
                            </div>
                          </div>
                          {card.tags?.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                              <Tag style={{ width: 13, height: 13, color: '#9090aa', flexShrink: 0 }} />
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
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#9090aa' }}>
              <LayoutGrid style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>No cards in this category yet.</p>
            </div>
          )}
        </div>
      </main>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteModal(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
              }}
            />
            {/* Dialog */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed', zIndex: 101,
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '90%', maxWidth: 380,
                background: '#fff', borderRadius: 22,
                padding: '28px 28px 24px',
                border: '1px solid rgba(225,29,72,0.15)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              }}>
              {/* Warning icon */}
              <div style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', background: 'rgba(225,29,72,0.09)', border: '1px solid rgba(225,29,72,0.18)' }}>
                <AlertTriangle style={{ width: 24, height: 24, color: '#e11d48' }} />
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18, color: '#111118', textAlign: 'center', marginBottom: 8 }}>
                Delete this deck?
              </h3>
              <p style={{ fontSize: 13, color: '#4a4a6a', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
                <strong style={{ color: '#111118' }}>&ldquo;{deck.title}&rdquo;</strong> and all{' '}
                <strong style={{ color: '#111118' }}>{deck.card_count} cards</strong> will be permanently deleted.
                This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 14, fontWeight: 600, fontSize: 14,
                    cursor: 'pointer', background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.1)', color: '#4a4a6a',
                  }}>
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 14, fontWeight: 700, fontSize: 14,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    background: deleting ? 'rgba(225,29,72,0.5)' : '#e11d48',
                    border: 'none', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'background 0.18s',
                  }}>
                  {deleting ? (
                    <><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Deleting…</>
                  ) : (
                    <><Trash2 style={{ width: 14, height: 14 }} /> Yes, Delete</>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
