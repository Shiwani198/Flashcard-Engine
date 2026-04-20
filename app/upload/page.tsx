'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, Sparkles, CheckCircle, AlertCircle, ArrowRight, Zap, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/Navbar';
import { getSessionId } from '@/hooks/useSession';

type UploadState = 'idle' | 'uploading' | 'generating' | 'done' | 'error';

const hints = [
  'Tip: Smaller PDFs (1–30 pages) produce the most focused decks.',
  'Tip: Text-based PDFs work best — scanned images can\'t be parsed.',
  'Tip: Chapter-level chunks produce better cards than entire books.',
  'Groq runs at ~500 tokens/second — cards appear in ~2 seconds.',
];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile]           = useState<File | null>(null);
  const [title, setTitle]         = useState('');
  const [state, setState]         = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const [cardCount, setCardCount] = useState(0);
  const [deckId, setDeckId]       = useState('');
  const [progress, setProgress]   = useState(0);
  const [hintIdx]                 = useState(() => Math.floor(Math.random() * hints.length));

  const onDrop = useCallback((accepted: File[]) => {
    const pdf = accepted[0];
    if (!pdf) return;
    setFile(pdf);
    const name = pdf.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    setTitle(name.charAt(0).toUpperCase() + name.slice(1));
    setState('idle'); setErrorMsg('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1, maxSize: 20 * 1024 * 1024,
    onDropRejected: (r) => toast.error(r[0]?.errors[0]?.code === 'file-too-large' ? 'File too large — max 20 MB.' : 'Only PDF files are accepted.'),
  });

  const handleGenerate = async () => {
    if (!file || !title.trim()) { toast.error('Please select a PDF and enter a title.'); return; }
    const sessionId = getSessionId();
    setState('uploading'); setProgress(15);
    try {
      const formData = new FormData();
      formData.append('file', file); formData.append('title', title.trim()); formData.append('session_id', sessionId);
      setState('generating'); setProgress(40);
      const timer = setInterval(() => setProgress((p) => p < 88 ? p + 4 : p), 700);
      const res = await fetch('/api/generate-cards', { method: 'POST', body: formData });
      clearInterval(timer);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate cards');
      setProgress(100); setCardCount(data.card_count); setDeckId(data.deck_id);
      setState('done'); toast.success(`✨ ${data.card_count} flashcards generated!`);
    } catch (err) {
      setState('error');
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMsg(msg); toast.error(msg);
    }
  };

  const reset = () => { setFile(null); setTitle(''); setState('idle'); setErrorMsg(''); setProgress(0); };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7' }}>
      <Navbar />
      <main style={{ paddingTop: 88, paddingBottom: 64 }}>
        <div className="layout-narrow">

          {/* Page header — always centered */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 26, color: '#111118', marginBottom: 8 }}>
              Create a New Deck
            </h1>
            <p style={{ fontSize: 14, color: '#4a4a6a', lineHeight: 1.65 }}>
              Upload a PDF and let AI generate a smart, practice-ready flashcard deck in seconds.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">

            {/* ── Done ── */}
            {state === 'done' && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ background: '#fff', borderRadius: 24, padding: '48px 32px', textAlign: 'center',
                  border: '1px solid rgba(5,150,105,0.2)', boxShadow: '0 8px 32px rgba(5,150,105,0.08)' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)', margin: '0 auto 20px' }}>
                  <CheckCircle size={32} color="#059669" />
                </div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 22, color: '#111118', marginBottom: 8 }}>
                  {cardCount} cards generated!
                </h2>
                <p style={{ fontSize: 14, color: '#4a4a6a', marginBottom: 28 }}>
                  Your deck &ldquo;{title}&rdquo; is ready to study.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => router.push(`/deck/${deckId}/practice`)} className="btn-primary" style={{ fontSize: 14 }}>
                    <Brain size={16} /> Start Studying
                  </button>
                  <button onClick={() => router.push(`/deck/${deckId}`)} className="btn-ghost" style={{ fontSize: 14 }}>
                    View Deck <ArrowRight size={15} />
                  </button>
                  <button onClick={reset} className="btn-ghost" style={{ fontSize: 14 }}>
                    Upload Another
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Loading ── */}
            {(state === 'generating' || state === 'uploading') && (
              <motion.div key="loading"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: '#fff', borderRadius: 24, padding: '48px 32px', textAlign: 'center',
                  border: '1px solid rgba(109,40,217,0.15)', boxShadow: '0 4px 24px rgba(109,40,217,0.07)' }}>
                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="url(#rg)" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                      className="progress-ring-circle" />
                    <defs>
                      <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6d28d9" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#6d28d9' }}>{progress}%</div>
                </div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 19, color: '#111118', marginBottom: 8 }}>
                  {state === 'uploading' ? 'Reading your PDF…' : 'AI is crafting your cards…'}
                </h2>
                <p className="pulse-glow" style={{ fontSize: 13, color: '#4a4a6a', marginBottom: 20 }}>
                  {state === 'generating' ? 'Groq LPU at ~500 tok/s. Usually done in 2–5 seconds.' : 'Extracting text from your document…'}
                </p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999,
                  fontSize: 12, fontWeight: 600, background: 'rgba(109,40,217,0.08)', color: '#6d28d9', border: '1px solid rgba(109,40,217,0.15)' }}>
                  <Zap size={12} /> Groq LPU · Llama 3.3 70B
                </span>
              </motion.div>
            )}

            {/* ── Form ── */}
            {(state === 'idle' || state === 'error') && (
              <motion.div key="form"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Drop zone */}
                <div {...getRootProps()} style={{
                  borderRadius: 20, border: `2px dashed ${isDragActive ? '#6d28d9' : file ? 'rgba(109,40,217,0.35)' : 'rgba(0,0,0,0.14)'}`,
                  padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                  background: isDragActive ? 'rgba(109,40,217,0.05)' : file ? 'rgba(109,40,217,0.03)' : '#fff',
                  boxShadow: isDragActive ? '0 0 0 4px rgba(109,40,217,0.08)' : '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180,
                }}>
                  <input {...getInputProps()} />
                  <AnimatePresence mode="wait">
                    {file ? (
                      <motion.div key="file" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.2)' }}>
                          <FileText size={22} color="#6d28d9" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: '#111118', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                          <p style={{ fontSize: 12, color: '#9090aa', marginTop: 2 }}>{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(''); }}
                          style={{ padding: 7, borderRadius: 10, background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                          <X size={15} color="#9090aa" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)' }}>
                          <Upload size={24} color={isDragActive ? '#6d28d9' : '#9090aa'} />
                        </div>
                        <p style={{ fontWeight: 600, color: '#111118', marginBottom: 6 }}>
                          {isDragActive ? 'Drop it here!' : 'Drag & drop your PDF'}
                        </p>
                        <p style={{ fontSize: 13, color: '#9090aa' }}>
                          or <span style={{ color: '#6d28d9', fontWeight: 600 }}>click to browse</span> · Max 20 MB
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Title input */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4a4a6a', marginBottom: 8 }}>
                    Deck Title
                  </label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Quadratic Equations, French Revolution…"
                    className="input-field" />
                </div>

                {/* Error */}
                {state === 'error' && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.18)', color: '#e11d48', fontSize: 13 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                {/* Generate button */}
                <button onClick={handleGenerate} disabled={!file || !title.trim()}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px', borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: file && title.trim() ? 'pointer' : 'not-allowed',
                    ...(file && title.trim() ? {
                      background: 'linear-gradient(135deg, #6d28d9, #5b21b6)', color: '#fff',
                      border: '1px solid rgba(109,40,217,0.4)', boxShadow: '0 2px 10px rgba(109,40,217,0.25)',
                    } : {
                      background: 'rgba(0,0,0,0.05)', color: '#9090aa', border: '1px solid rgba(0,0,0,0.08)',
                    }),
                  }}>
                  <Sparkles size={18} /> Generate Flashcards with AI
                </button>

                <p style={{ textAlign: 'center', fontSize: 12, color: '#9090aa' }}>{hints[hintIdx]}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
