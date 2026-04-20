'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, BookOpen, Trash2, Play, Clock, Star, Sparkles, LayoutGrid, TrendingUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/Navbar';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase/client';
import type { Deck } from '@/lib/types';

interface DeckWithStats extends Deck { due_count: number; mastered_count: number; }

const COLORS = [
  { light: 'rgba(109,40,217,0.06)', accent: '#6d28d9', border: 'rgba(109,40,217,0.14)' },
  { light: 'rgba(37,99,235,0.06)',  accent: '#2563eb', border: 'rgba(37,99,235,0.14)'  },
  { light: 'rgba(5,150,105,0.06)',  accent: '#059669', border: 'rgba(5,150,105,0.14)'  },
  { light: 'rgba(217,119,6,0.06)',  accent: '#d97706', border: 'rgba(217,119,6,0.14)'  },
  { light: 'rgba(225,29,72,0.06)',  accent: '#e11d48', border: 'rgba(225,29,72,0.14)'  },
];
function getColor(id: string) { return COLORS[(id.charCodeAt(0) * 31 + (id.charCodeAt(1)||0)) % COLORS.length]; }

function Skeleton() {
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: 22, border: '1px solid rgba(0,0,0,0.07)', height: 200 }}>
      <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: '35%', marginBottom: 22 }} />
      <div className="skeleton" style={{ height: 6, width: '100%', marginBottom: 22, borderRadius: 999 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ height: 36, flex: 1, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 36, flex: 1, borderRadius: 12 }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const sessionId = useSession();
  const [decks, setDecks]       = useState<DeckWithStats[]>([]);
  // Start as true — session loads async, we show skeletons until it's ready
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    if (!sessionId) {
      // Session not yet hydrated from localStorage — keep showing skeletons
      setLoading(true);
      return;
    }
    setLoading(true);
    const { data: rawDecks, error } = await supabase.from('decks').select('*').eq('session_id', sessionId).order('updated_at', { ascending: false });
    if (error || !rawDecks) { setLoading(false); return; }

    const decksWithStats = await Promise.all(rawDecks.map(async (deck) => {
      const { data: cards } = await supabase.from('cards').select('id').eq('deck_id', deck.id);
      const cardIds = cards?.map((c) => c.id) || [];
      let due_count = 0, mastered_count = 0;
      if (cardIds.length > 0) {
        const now = new Date().toISOString();
        const { data: progress } = await supabase.from('card_progress').select('due_at, interval_days').eq('session_id', sessionId).in('card_id', cardIds);
        due_count      = progress?.filter((p) => p.due_at <= now).length || 0;
        mastered_count = progress?.filter((p) => p.interval_days >= 21).length || 0;
      }
      return { ...deck, due_count, mastered_count };
    }));
    setDecks(decksWithStats);
    setLoading(false);
  }, [sessionId]);


  useEffect(() => { loadDecks(); }, [loadDecks]);

  const handleDelete = async (deckId: string, title: string) => {
    setDeletingId(deckId);
    const res = await fetch(`/api/decks?id=${deckId}&session_id=${sessionId}`, { method: 'DELETE' });
    if (res.ok) { setDecks((p) => p.filter((d) => d.id !== deckId)); toast.success(`"${title}" deleted`); }
    else toast.error('Failed to delete deck');
    setDeletingId(null);
  };

  const filtered = decks.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));
  const totalCards    = decks.reduce((s, d) => s + d.card_count, 0);
  const totalDue      = decks.reduce((s, d) => s + d.due_count, 0);
  const totalMastered = decks.reduce((s, d) => s + d.mastered_count, 0);
  const mastery = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7' }}>
      <Navbar />
      <main style={{ paddingTop: 88, paddingBottom: 64 }}>
        <div className="layout-wide">

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 26, color: '#111118', marginBottom: 4 }}>
                Your Decks
              </h1>
              <p style={{ fontSize: 13, color: '#9090aa' }}>
                {loading ? 'Loading…' : decks.length === 0 ? 'Upload a PDF to get started' : `${decks.length} deck${decks.length !== 1 ? 's' : ''} · ${totalCards} cards`}
              </p>
            </div>
            <Link href="/upload" className="btn-primary" style={{ fontSize: 14, padding: '8px 18px', borderRadius: 12, flexShrink: 0 }}>
              <Plus size={16} /> New Deck
            </Link>
          </div>

          {/* Stats */}
          {!loading && decks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Total Cards', value: totalCards,  icon: BookOpen,    accent: '#6d28d9', bg: 'rgba(109,40,217,0.08)' },
                { label: 'Due Today',   value: totalDue,    icon: Clock,       accent: '#d97706', bg: 'rgba(217,119,6,0.08)'  },
                { label: 'Mastered',   value: totalMastered,icon: Star,        accent: '#059669', bg: 'rgba(5,150,105,0.08)'  },
                { label: 'Mastery %',  value: `${mastery}%`,icon: TrendingUp,  accent: '#2563eb', bg: 'rgba(37,99,235,0.08)'  },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <div style={{ padding: 10, borderRadius: 12, background: s.bg, flexShrink: 0 }}>
                    <s.icon size={16} color={s.accent} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: '#111118', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#9090aa', marginTop: 2 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Search */}
          {!loading && decks.length > 2 && (
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <Search size={15} color="#9090aa" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Search decks…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="input-field" style={{ paddingLeft: 40, paddingRight: 40 }} />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={15} color="#9090aa" />
                </button>
              )}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[0,1,2].map((i) => <Skeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state — OUTSIDE the grid so centering works */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(109,40,217,0.09)', border: '1px solid rgba(109,40,217,0.18)', marginBottom: 20 }}>
                {search ? <Search size={28} color="#6d28d9" /> : <Sparkles size={28} color="#6d28d9" />}
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 18, color: '#111118', marginBottom: 8 }}>
                {search ? 'No decks match your search' : 'No decks yet'}
              </h2>
              <p style={{ fontSize: 14, color: '#4a4a6a', marginBottom: 24, maxWidth: 280 }}>
                {search ? 'Try a different search term.' : 'Upload a PDF to create your first deck.'}
              </p>
              {!search && (
                <Link href="/upload" className="btn-primary" style={{ fontSize: 14, padding: '9px 20px', borderRadius: 12 }}>
                  <Plus size={15} /> Create First Deck
                </Link>
              )}
            </div>
          ) : (
            <AnimatePresence>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {filtered.map((deck, i) => {
                  const col = getColor(deck.id);
                  const pct = deck.card_count > 0 ? Math.round((deck.mastered_count / deck.card_count) * 100) : 0;
                  return (
                    <motion.div key={deck.id}
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="deck-card group"
                      style={{ background: `linear-gradient(135deg, ${col.light}, #fff)`, borderColor: col.border }}>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link href={`/deck/${deck.id}`} style={{ textDecoration: 'none' }}>
                            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: '#111118', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {deck.title}
                            </h3>
                          </Link>
                          <p style={{ fontSize: 12, color: '#9090aa', marginTop: 4 }}>
                            {deck.card_count} cards{deck.pdf_name ? ` · ${deck.pdf_name}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(deck.id, deck.title)}
                          disabled={deletingId === deck.id}
                          title="Delete deck"
                          style={{
                            flexShrink: 0, width: 32, height: 32,
                            borderRadius: 10, border: '1px solid rgba(225,29,72,0.18)',
                            background: 'rgba(225,29,72,0.07)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#e11d48', transition: 'all 0.18s',
                            opacity: deletingId === deck.id ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(225,29,72,0.16)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(225,29,72,0.07)'; }}>
                          {deletingId === deck.id
                            ? <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(225,29,72,0.3)', borderTopColor: '#e11d48', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                            : <Trash2 size={14} />}
                        </button>
                      </div>

                      {/* Mastery bar */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: '#9090aa' }}>Mastery</span>
                          <span style={{ fontWeight: 600, color: col.accent }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                            style={{ height: '100%', borderRadius: 999, background: col.accent }} />
                        </div>
                      </div>

                      {deck.due_count > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <span className="badge-learning" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 999, fontWeight: 600 }}>
                            <Clock size={11} /> {deck.due_count} due
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link href={`/deck/${deck.id}/practice`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: col.accent, color: '#fff', border: 'none' }}>
                          <Play size={13} /> Study
                        </Link>
                        <Link href={`/deck/${deck.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: 'rgba(0,0,0,0.05)', color: '#4a4a6a', border: '1px solid rgba(0,0,0,0.08)' }}>
                          <LayoutGrid size={13} /> View
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}
