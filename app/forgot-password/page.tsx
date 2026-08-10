'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!supabase) return setError('Supabase is not configured.');
    if (!email.trim()) return setError('Enter your email address.');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return <main className="authPage"><div className="authCard"><div className="authLogo">sudo<span>ai</span></div>{sent ? <><div className="authIcon">✓</div><h1>Check your email</h1><p className="authMuted">If an account exists for {email}, we sent a password reset link.</p><Link className="authButton" href="/">Back to SudoAI</Link></> : <><h1>Reset your password</h1><p className="authMuted">Enter your email and we'll send you a secure reset link.</p><form onSubmit={submit} className="authForm"><label>Email<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>{error && <div className="authError">{error}</div>}<button className="authButton" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button></form><Link className="authBack" href="/">← Back to sign in</Link></>}</div></main>;
}
