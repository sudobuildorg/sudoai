'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const plans = ['free', 'pro', 'pro_max', 'ultra'];

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Please sign in as an administrator.'); setLoading(false); return; }
    const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!admin) { setError('Access denied. Your account is not an admin.'); setLoading(false); return; }
    const [{ data: profiles, error: pe }, { data: pay, error: paye }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_requests').select('*').order('created_at', { ascending: false })
    ]);
    if (pe || paye) setError((pe || paye)?.message || 'Could not load dashboard.');
    setUsers(profiles || []); setPayments(pay || []); setLoading(false);
  }

  async function updatePayment(id: string, status: 'approved' | 'rejected') {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payment = payments.find(p => p.id === id);
    const { error: e } = await supabase.from('payment_requests').update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (e) { setError(e.message); return; }
    if (status === 'approved' && payment) {
      const allowance: Record<string, [number, number]> = { pro: [1000000, 300], pro_max: [3000000, 800], ultra: [6000000, 1500] };
      const [tokens, messages] = allowance[payment.plan] || [0, 0];
      await supabase.from('profiles').update({ plan: payment.plan, token_balance: tokens, tokens_used: 0, message_balance: messages, messages_used: 0, plan_activated_at: new Date().toISOString() }).eq('id', payment.user_id);
    }
    load();
  }

  useEffect(() => { load(); }, []);

  if (loading) return <main className="admin-shell"><p>Loading SudoAI Admin…</p></main>;
  if (error) return <main className="admin-shell"><div className="admin-card"><h1>SudoAI Admin</h1><p>{error}</p><button onClick={load}>Try again</button></div></main>;

  const counts = { users: users.length, pro: users.filter(u => u.plan === 'pro').length, proMax: users.filter(u => u.plan === 'pro_max').length, ultra: users.filter(u => u.plan === 'ultra').length, pending: payments.filter(p => p.status === 'pending').length };

  return <main className="admin-shell"><header className="admin-header"><div><div className="admin-brand">Sudo<span>AI</span></div><p>Admin Dashboard</p></div><button onClick={load}>Refresh</button></header>
    <section className="admin-stats">{[['Customers', counts.users], ['Pro', counts.pro], ['Pro Max', counts.proMax], ['Ultra', counts.ultra], ['Pending payments', counts.pending]].map(([label, value]) => <div className="admin-stat" key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</section>
    <section className="admin-card"><h2>Customers</h2><div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Plan</th><th>Token balance</th><th>Messages</th><th>Activated</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.email || u.full_name || u.id}</td><td><b>{u.plan || 'free'}</b></td><td>{Number(u.token_balance || 0).toLocaleString()} / {Number(u.tokens_used || 0).toLocaleString()} used</td><td>{u.messages_used || 0} / {u.message_balance || 0}</td><td>{u.plan_activated_at ? new Date(u.plan_activated_at).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div></section>
    <section className="admin-card"><h2>Payment requests</h2><div className="admin-table-wrap"><table><thead><tr><th>Plan</th><th>Amount</th><th>bKash</th><th>Transaction ID</th><th>Status</th><th>Action</th></tr></thead><tbody>{payments.map(p => <tr key={p.id}><td>{p.plan}</td><td>৳{p.amount}</td><td>{p.bkash_number}</td><td>{p.transaction_id}</td><td>{p.status}</td><td>{p.status === 'pending' && <><button onClick={() => updatePayment(p.id, 'approved')}>Approve</button> <button onClick={() => updatePayment(p.id, 'rejected')}>Reject</button></>}</td></tr>)}</tbody></table></div></section>
  </main>;
}
