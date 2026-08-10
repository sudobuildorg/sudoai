'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!supabase) return; supabase.auth.getSession().then(({ data }) => setReady(!!data.session)); const { data: l } = supabase.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY') setReady(!!session); }); return () => l.subscription.unsubscribe(); }, []);

  async function submit(e: FormEvent) { e.preventDefault(); setError(''); if (!supabase || !ready) return setError('This reset link is invalid or expired.'); if (password.length < 8) return setError('Password must be at least 8 characters.'); if (password !== confirm) return setError('Passwords do not match.'); const { error } = await supabase.auth.updateUser({ password }); if (error) return setError(error.message); setDone(true); }

  return <main className="authPage"><div className="authCard"><div className="authLogo">sudo<span>ai</span></div>{done ? <><div className="authIcon">✓</div><h1>Password updated</h1><p className="authMuted">Your password has been changed successfully.</p><Link className="authButton" href="/">Continue to SudoAI</Link></> : <><h1>Set a new password</h1><p className="authMuted">Choose a strong password for your SudoAI account.</p><form onSubmit={submit} className="authForm"><label>New password<input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label><label>Confirm password<input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" /></label>{error && <div className="authError">{error}</div>}<button className="authButton" disabled={!ready}>{ready ? 'Update password' : 'Checking reset link…'}</button></form></>}</div></main>;
}
