'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, LayoutDashboard, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload',    label: 'New Deck',  icon: Upload },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
      boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.06)' : 'none',
      transition: 'all 0.25s ease',
    }}>
      <div className="layout-wide" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={16} color="#6d28d9" />
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: '#111118' }}>
            Flash<span style={{ color: '#6d28d9' }}>Mind</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 14px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.18s',
                color: active ? '#6d28d9' : '#4a4a6a',
                background: active ? 'rgba(109,40,217,0.09)' : 'transparent',
                border: active ? '1px solid rgba(109,40,217,0.18)' : '1px solid transparent',
              }}>
                <item.icon size={15} />
                <span className="hide-mobile">{item.label}</span>
              </Link>
            );
          })}
          <Link href="/upload" className="btn-primary" style={{ marginLeft: 8, padding: '7px 16px', fontSize: 14, borderRadius: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={14} />
            <span className="hide-mobile">Create</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
