'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain, Zap, BarChart2, BookOpen, ArrowRight, Sparkles,
  Upload, CheckCircle, Star,
} from 'lucide-react';

const features = [
  { icon: Sparkles, title: 'AI-Powered Generation',  desc: 'Drop any PDF and get a comprehensive deck written by a cognitive-science-trained AI — not scraped by a bot.', accent: '#6d28d9', bg: 'rgba(109,40,217,0.07)', border: 'rgba(109,40,217,0.15)' },
  { icon: Zap,      title: 'SM-2 Spaced Repetition', desc: 'Cards you know well fade away. Cards you struggle with keep appearing. Science-backed, battle-tested.',        accent: '#2563eb', bg: 'rgba(37,99,235,0.07)',  border: 'rgba(37,99,235,0.15)'  },
  { icon: BarChart2,title: 'Mastery Tracking',        desc: 'See exactly what you\'ve mastered, what\'s shaky, and what\'s due. Motivating progress at a glance.',           accent: '#059669', bg: 'rgba(5,150,105,0.07)', border: 'rgba(5,150,105,0.15)'  },
  { icon: BookOpen, title: 'Smart Deck Management',   desc: 'Dozens of decks, instantly searchable. Pick up exactly where you left off — every time.',                       accent: '#d97706', bg: 'rgba(217,119,6,0.07)', border: 'rgba(217,119,6,0.15)'  },
];

const steps = [
  { n: '01', icon: Upload,   title: 'Upload a PDF',       desc: 'Drag any lecture notes, textbook chapter, or document.' },
  { n: '02', icon: Sparkles, title: 'AI generates cards',  desc: 'Groq LPU processes at 500 tok/s — ready in ~2 seconds.' },
  { n: '03', icon: Brain,    title: 'Study & retain',      desc: 'Flip cards, rate yourself, and let SM-2 schedule reviews.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 } }),
};

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7' }}>

      {/* ── Navbar ──────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 12px rgba(0,0,0,0.05)',
      }}>
        <div className="layout-wide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={16} color="#6d28d9" />
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: '#111118' }}>
              Flash<span style={{ color: '#6d28d9' }}>Mind</span>
            </span>
          </Link>
          <Link href="/dashboard" className="btn-primary" style={{ padding: '8px 20px', fontSize: 14, borderRadius: 12 }}>
            Open App <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────── */}
      <section style={{ paddingTop: 120, paddingBottom: 80, textAlign: 'center' }}>
        <div className="layout-narrow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: 'rgba(109,40,217,0.09)', border: '1px solid rgba(109,40,217,0.2)', color: '#6d28d9',
              marginBottom: 24,
            }}>
              <Sparkles size={13} />
              Powered by Groq LPU · Llama 3.3 70B
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1, color: '#111118', marginBottom: 20, textAlign: 'center' }}
          >
            Turn any PDF into{' '}
            <span className="gradient-text">smart flashcards</span>
            {' '}in seconds
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            style={{ fontSize: 17, color: '#4a4a6a', marginBottom: 32, lineHeight: 1.6, textAlign: 'center', maxWidth: 500 }}
          >
            Drop in a chapter, get back cards that feel like they were written by a great teacher.
            Then let spaced repetition do the rest.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}
          >
            <Link href="/upload" className="btn-primary" style={{ fontSize: 16, padding: '13px 28px', borderRadius: 16 }}>
              <Sparkles size={18} /> Create Your First Deck
            </Link>
            <Link href="/dashboard" className="btn-ghost" style={{ fontSize: 16, padding: '13px 28px', borderRadius: 16 }}>
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ display: 'flex', gap: 48, justifyContent: 'center', marginBottom: 56, flexWrap: 'wrap' }}
          >
            {[
              { value: '~2s',     label: 'Card generation', sub: 'via Groq LPU' },
              { value: 'SM-2',    label: 'Algorithm',       sub: 'Proven retention' },
              { value: '5 types', label: 'Card variants',   sub: 'Per concept' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: '#111118' }}>{s.value}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#4a4a6a' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#9090aa' }}>{s.sub}</div>
              </div>
            ))}
          </motion.div>

          {/* Card preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55 }}
            style={{ position: 'relative', width: '100%', maxWidth: 520, textAlign: 'left' }}
          >
            <div style={{
              position: 'absolute', bottom: -12, right: -12, width: '90%', height: '100%',
              borderRadius: 18, background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.12)',
              transform: 'rotate(2deg)', display: 'none',
            }} className="hide-mobile" />
            <div style={{
              background: '#fff', borderRadius: 18, padding: 24,
              border: '1px solid rgba(109,40,217,0.2)', boxShadow: '0 8px 32px rgba(109,40,217,0.1)',
              position: 'relative',
            }}>
              <p className="section-label" style={{ marginBottom: 12 }}>Question</p>
              <p style={{ fontWeight: 600, color: '#111118', marginBottom: 16, fontSize: 15 }}>
                What is the SM-2 spaced repetition algorithm?
              </p>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 16 }} />
              <p style={{ fontSize: 13, color: '#4a4a6a', lineHeight: 1.65 }}>
                SM-2 calculates optimal review intervals based on a card&apos;s ease factor and performance history,
                minimizing review load while maximizing retention.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                {['😵 Again', '😐 Hard', '🙂 Good', '🚀 Easy'].map((r) => (
                  <span key={r} className="tag-pill">{r}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────── */}
      <section style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="layout-wide">
        <motion.div style={{ textAlign: 'center', marginBottom: 48 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="section-label" style={{ marginBottom: 8 }}>How it works</p>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: '#111118' }}>
              Study smarter in 3 steps
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {steps.map((step, i) => (
              <motion.div key={step.title} custom={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
                style={{ background: '#fff', borderRadius: 20, padding: 28, textAlign: 'center', position: 'relative',
                  border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(109,40,217,0.09)', border: '1px solid rgba(109,40,217,0.15)', margin: '0 auto 20px' }}>
                  <step.icon size={20} color="#6d28d9" />
                </div>
                <span style={{ position: 'absolute', top: 20, right: 20, fontSize: 20, fontWeight: 900,
                  fontFamily: 'Outfit, sans-serif', color: '#e8e8f0' }}>{step.n}</span>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111118', marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: '#4a4a6a', lineHeight: 1.6 }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="layout-wide">
        <motion.div style={{ textAlign: 'center', marginBottom: 48 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="section-label" style={{ marginBottom: 8 }}>Everything you need</p>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: '#111118', marginBottom: 12 }}>
              Built for real learning
            </h2>
            <p style={{ fontSize: 14, color: '#4a4a6a', maxWidth: 420, margin: '0 auto' }}>
              Built on decades of cognitive science research. No filler, no fluff.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {features.map((f, i) => (
              <motion.div key={f.title} custom={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
                className="hover-lift"
                style={{ background: '#fff', borderRadius: 20, padding: 28, border: `1px solid ${f.border}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'inline-flex', padding: 12, borderRadius: 14, background: f.bg, border: `1px solid ${f.border}`, marginBottom: 18 }}>
                  <f.icon size={20} color={f.accent} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111118', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#4a4a6a', lineHeight: 1.65 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust bar ──────────────────────────────── */}
      <section style={{ paddingBottom: 40 }}>
        <div className="layout-wide">
          <div style={{ background: 'rgba(109,40,217,0.04)', border: '1px solid rgba(109,40,217,0.15)',
            borderRadius: 20, padding: '20px 28px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />)}
              <span style={{ fontSize: 14, fontWeight: 500, color: '#4a4a6a', marginLeft: 8 }}>
                No signup · Works with any PDF
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#059669' }}>
              <CheckCircle size={16} /> Free forever
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section style={{ paddingTop: 40, paddingBottom: 80 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="layout-narrow">
            <div style={{ background: '#fff', borderRadius: 28, padding: '56px 48px', textAlign: 'center',
              border: '1px solid rgba(109,40,217,0.18)', boxShadow: '0 12px 48px rgba(109,40,217,0.1)' }}>
              <Brain size={44} color="#6d28d9" style={{ margin: '0 auto 20px', display: 'block' }} className="float" />
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', color: '#111118', marginBottom: 12 }}>
                Ready to study smarter?
              </h2>
              <p style={{ color: '#4a4a6a', fontSize: 15, marginBottom: 28 }}>
                No sign-up required. Drop a PDF and start learning in seconds.
              </p>
              <Link href="/upload" className="btn-primary" style={{ fontSize: 16, padding: '13px 32px', borderRadius: 16, display: 'inline-flex' }}>
                <Sparkles size={18} /> Get Started — It&apos;s Free
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 28, paddingBottom: 28 }}>
        <div className="layout-wide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#9090aa' }}>
            <Brain size={15} color="#6d28d9" />
            <span style={{ fontWeight: 600, color: '#111118' }}>FlashMind</span>
            <span>— AI Flashcard Engine</span>
          </div>
          <span style={{ fontSize: 13, color: '#9090aa' }}>Built with Groq · Supabase · Next.js</span>
        </div>
      </footer>
    </div>
  );
}
