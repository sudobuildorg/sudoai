'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!supabase) { setError('Authentication is not configured.'); setLoading(false); return; }
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError || !data.user) { setError(signInError?.message || 'Invalid login.'); setLoading(false); return; }
    const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (!admin) { await supabase.auth.signOut(); setError('This account is not authorized as an administrator.'); setLoading(false); return; }
    router.replace('/admin');
  }

  return <main className="admin-login"><form onSubmit={submit} className="admin-login-card"><div className="brand">Sudo<span>AI</span></div><h1>Admin Login</h1><p>Sign in to manage customers, plans and payments.</p><label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin email" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" /></label>{error && <div className="error">{error}</div>}<button disabled={loading}>{loading ? 'Signing in…' : 'Sign in to Admin'}</button></form><style jsx>{`.admin-login{min-height:100vh;display:grid;place-items:center;padding:20px;background:#f7f7f8;font-family:system-ui,sans-serif}.admin-login-card{width:min(420px,100%);background:#fff;border:1px solid #e5e5e5;border-radius:20px;padding:30px;box-shadow:0 12px 40px #0000000d}.brand{font-size:28px;font-weight:800}.brand span{font-weight:400}.admin-login-card h1{margin:28px 0 8px}.admin-login-card p{color:#666;margin-bottom:24px}.admin-login-card label{display:block;font-size:14px;font-weight:600;margin:14px 0}.admin-login-card input{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px 13px;border:1px solid #d8d8d8;border-radius:10px;font-size:16px}.admin-login-card button{width:100%;margin-top:12px;padding:13px;border:0;border-radius:10px;background:#111;color:#fff;font-weight:700;font-size:15px;cursor:pointer}.admin-login-card button:disabled{opacity:.6}.error{padding:11px;border-radius:10px;background:#fff0f0;color:#b42318;font-size:14px;margin-top:14px}`}</style></main>;
}
