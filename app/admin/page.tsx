'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

const allowance: Record<string, [number, number]> = { text_starter: [300000, 100], pro: [1000000, 300], pro_max: [3000000, 800], ultra: [6000000, 1500] };
const planLabels: Record<string, string> = { text_starter: 'Text Starter', pro: 'Pro', pro_max: 'Pro Max', ultra: 'Ultra' };

type Provider = { id: string; name: string; keyEnv: string; configured: boolean; status: 'online'|'offline'|'not_configured'; balance: string; note: string };

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerChecked, setProviderChecked] = useState('');
  const [providerLoading, setProviderLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadProviders() {
    if (!supabase) return;
    setProviderLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/providers', { headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {} , cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || 'Could not check provider APIs.');
    else { setProviders(data.providers || []); setProviderChecked(data.checkedAt || ''); }
    setProviderLoading(false);
  }

  async function load() {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Please sign in as an administrator.'); setLoading(false); return; }
    const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!admin) { setError('Access denied. Your account is not an admin.'); setLoading(false); return; }
    const [{ data: profiles, error: pe }, { data: pay, error: paye }, { data: usageRows, error: ue }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('usage_daily').select('user_id,message_count')
    ]);
    if (pe || paye || ue) setError((pe || paye || ue)?.message || 'Could not load dashboard.');
    const usageTotals: Record<string, number> = {};
    (usageRows || []).forEach((row: any) => { usageTotals[row.user_id] = (usageTotals[row.user_id] || 0) + Number(row.message_count || 0); });
    setUsers(profiles || []); setPayments(pay || []); setUsage(usageTotals); setLoading(false);
    loadProviders();
  }

  async function updatePayment(id: string, status: 'approved' | 'rejected') {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payment = payments.find(p => p.id === id);
    const { error: e } = await supabase.from('payment_requests').update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (e) { setError(e.message); return; }
    if (status === 'approved' && payment) {
      const [tokens, messages] = allowance[payment.plan] || [0, 0];
      const { error: activateError } = await supabase.from('profiles').update({ plan: payment.plan, token_balance: tokens, tokens_used: 0, message_balance: messages, messages_used: 0, plan_activated_at: new Date().toISOString() }).eq('id', payment.user_id);
      if (activateError) { setError(activateError.message); return; }
    }
    load();
  }

  useEffect(() => { load(); }, []);

  const approved = payments.filter(p => p.status === 'approved');
  const pending = payments.filter(p => p.status === 'pending');
  const revenue = approved.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const estimatedCost = approved.reduce((sum, p) => sum + Number(p.estimated_cost_bdt || 0), 0);
  const estimatedProfit = approved.reduce((sum, p) => sum + Number(p.estimated_profit_bdt || 0), 0);
  const profitByPlan = useMemo(() => approved.reduce((acc, p) => { const key = p.plan || 'unknown'; acc[key] = (acc[key] || 0) + Number(p.estimated_profit_bdt || 0); return acc; }, {} as Record<string, number>), [approved]);

  if (loading) return <main className="admin-shell"><p>Loading SudoAI Admin…</p></main>;
  if (error) return <main className="admin-shell"><div className="admin-card"><h1>SudoAI Admin</h1><p>{error}</p><button onClick={load}>Try again</button></div></main>;

  const counts = { users: users.length, textStarter: users.filter(u => u.plan === 'text_starter').length, pro: users.filter(u => u.plan === 'pro').length, proMax: users.filter(u => u.plan === 'pro_max').length, ultra: users.filter(u => u.plan === 'ultra').length, pending: pending.length };

  return <main className="admin-shell"><header className="admin-header"><div><div className="admin-brand">Sudo<span>AI</span></div><p>Admin Dashboard</p></div><button onClick={load}>Refresh</button></header>
    <section className="admin-stats">{[['Customers', counts.users], ['Text Starter', counts.textStarter], ['Pro', counts.pro], ['Pro Max', counts.proMax], ['Ultra', counts.ultra], ['Pending', counts.pending], ['Revenue', `৳${revenue.toLocaleString()}`], ['Est. Profit', `৳${estimatedProfit.toLocaleString()}`]].map(([label, value]) => <div className="admin-stat" key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</section>
    <section className="admin-card"><div className="sectionHeading"><div><h2>API providers</h2><p className="admin-help">Live key connectivity checks. API secrets are never shown in the dashboard.</p></div><button onClick={loadProviders} disabled={providerLoading}>{providerLoading ? 'Checking…' : 'Check APIs'}</button></div><div className="providerGrid">{providers.map(p => <div className="providerCard" key={p.id}><div className="providerTop"><strong>{p.name}</strong><span className={'providerStatus '+p.status}>{p.status === 'online' ? '● Online' : p.status === 'offline' ? '● Error' : '○ Not configured'}</span></div><div className="providerBalance"><small>Balance / credits</small><b>{p.balance}</b></div><div className="providerNote">{p.note}</div><small className="providerEnv">{p.keyEnv}</small></div>)}{!providers.length && <div className="providerEmpty">No provider results yet. Click <b>Check APIs</b>.</div>}</div>{providerChecked && <p className="providerChecked">Last checked {new Date(providerChecked).toLocaleString()}</p>}</section>
    <section className="admin-card"><h2>Profit overview</h2><div className="profitGrid"><div><span>Approved revenue</span><b>৳{revenue.toLocaleString()}</b></div><div><span>Estimated provider cost</span><b>৳{estimatedCost.toLocaleString()}</b></div><div><span>Estimated gross profit</span><b>৳{estimatedProfit.toLocaleString()}</b></div></div><div className="profitPlans">{Object.entries(profitByPlan).map(([p,v])=><span key={p}><b>{planLabels[p]||p}</b> ৳{Number(v).toLocaleString()}</span>)}</div><p className="profitNote">Profit is an estimate based on the package cost assumptions stored in the payment table. It is not a provider invoice.</p></section>
    <section className="admin-card"><h2>Customers</h2><div className="admin-table-wrap"><table><thead><tr><th>Customer</th><th>Email</th><th>Plan</th><th>Messages used</th><th>Message limit</th><th>Tokens used</th><th>Token balance</th><th>Activated</th></tr></thead><tbody>{users.map(u => { const used = usage[u.id] ?? Number(u.messages_used || 0); return <tr key={u.id}><td><div className="customerCell"><strong>{u.display_name || u.email?.split('@')[0] || 'Customer'}</strong><small>{u.id}</small></div></td><td>{u.email || '—'}</td><td><b>{planLabels[u.plan] || u.plan || 'Free'}</b></td><td><b>{used.toLocaleString()}</b></td><td>{Number(u.message_balance || 0).toLocaleString()}</td><td>{Number(u.tokens_used || 0).toLocaleString()}</td><td>{Number(u.token_balance || 0).toLocaleString()}</td><td>{u.plan_activated_at ? new Date(u.plan_activated_at).toLocaleDateString() : '—'}</td></tr>})}</tbody></table></div></section>
    <section className="admin-card"><h2>Payment requests</h2><p className="admin-help">Verify the bKash number and transaction ID before approving. Approved packages activate immediately and the customer can use them.</p><div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>bKash</th><th>Transaction ID</th><th>Status</th><th>Est. Profit</th><th>Action</th></tr></thead><tbody>{payments.map(p => <tr key={p.id}><td>{p.user_email || p.user_id}</td><td>{planLabels[p.plan] || p.plan}</td><td>৳{Number(p.amount || 0).toLocaleString()}</td><td>{p.bkash_number}</td><td>{p.transaction_id}</td><td><span className={'status '+p.status}>{p.status}</span></td><td>৳{Number(p.estimated_profit_bdt || 0).toLocaleString()}</td><td>{p.status === 'pending' && <><button onClick={() => updatePayment(p.id, 'approved')}>Approve</button> <button onClick={() => updatePayment(p.id, 'rejected')}>Reject</button></>}</td></tr>)}</tbody></table></div></section>
    <style jsx>{`.admin-shell{min-height:100vh;background:#08111f;color:#eef4ff;padding:28px;font-family:system-ui,sans-serif}.admin-header{display:flex;justify-content:space-between;align-items:center;max-width:1500px;margin:0 auto 22px}.admin-brand{font-size:30px;font-weight:800}.admin-brand span{font-weight:400}.admin-header p{margin:4px 0;color:#91a2b9}.admin-header button,.admin-card button{border:1px solid #31425d;background:#142238;color:#fff;border-radius:9px;padding:9px 12px;cursor:pointer}.admin-card button:disabled{opacity:.55;cursor:wait}.admin-stats{max-width:1500px;margin:0 auto 18px;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px}.admin-stat{background:#0e1a2b;border:1px solid #22344d;border-radius:14px;padding:14px}.admin-stat small{display:block;color:#8fa1b8;font-size:11px}.admin-stat strong{display:block;font-size:20px;margin-top:7px}.admin-card{max-width:1500px;margin:0 auto 18px;background:#0e1a2b;border:1px solid #22344d;border-radius:18px;padding:18px}.admin-card h2{margin:0 0 14px}.admin-help,.profitNote{color:#91a2b9;font-size:12px}.sectionHeading{display:flex;justify-content:space-between;align-items:center;gap:16px}.sectionHeading h2{margin-bottom:3px}.providerGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.providerCard{background:#101f32;border:1px solid #263b56;border-radius:14px;padding:15px}.providerTop{display:flex;justify-content:space-between;gap:8px;align-items:center}.providerStatus{font-size:10px;font-weight:800}.providerStatus.online{color:#77e0a0}.providerStatus.offline{color:#ff8e9a}.providerStatus.not_configured{color:#9aa9bd}.providerBalance{margin:18px 0 10px}.providerBalance small{display:block;color:#8fa1b8;font-size:11px}.providerBalance b{display:block;font-size:19px;margin-top:5px}.providerNote{font-size:11px;color:#a5b3c7;line-height:1.45;min-height:34px}.providerEnv{display:block;color:#60738d;font-size:9px;margin-top:10px}.providerEmpty{border:1px dashed #2d405c;border-radius:12px;padding:18px;color:#8fa1b8}.providerChecked{color:#60738d;font-size:10px;margin:12px 0 0}.admin-table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:1200px}th,td{text-align:left;padding:11px 10px;border-bottom:1px solid #1d2c42;font-size:13px}th{color:#8fa1b8;font-size:11px;text-transform:uppercase;letter-spacing:.04em}.customerCell strong,.customerCell small{display:block}.customerCell small{color:#60738d;font-size:9px;margin-top:3px}.profitGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.profitGrid div{background:#132238;border:1px solid #253a55;border-radius:12px;padding:14px}.profitGrid span{display:block;color:#8fa1b8;font-size:12px}.profitGrid b{display:block;font-size:22px;margin-top:5px}.profitPlans{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.profitPlans span{background:#142238;border:1px solid #263b57;padding:8px 10px;border-radius:999px;font-size:12px}.status{padding:4px 8px;border-radius:999px;font-size:11px}.status.pending{background:#3a2c10;color:#ffd27a}.status.approved{background:#123522;color:#8ff0b0}.status.rejected{background:#3a1820;color:#ff9daa}@media(max-width:1100px){.admin-stats{grid-template-columns:repeat(4,1fr)}.providerGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.admin-shell{padding:14px}.admin-stats{grid-template-columns:repeat(2,1fr)}.providerGrid{grid-template-columns:1fr}.profitGrid{grid-template-columns:1fr}.admin-header,.sectionHeading{align-items:flex-start}.sectionHeading{flex-direction:column}}`}</style>
  </main>;
}
