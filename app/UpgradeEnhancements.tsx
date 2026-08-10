'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type PlanId = 'text_starter' | 'pro' | 'pro_max' | 'ultra';
const PLANS: Record<PlanId, { name: string; bd: number; intl: string; tokens: string; messages: string; description: string }> = {
  text_starter: { name: 'Text Starter', bd: 150, intl: '$1.99', tokens: '300K', messages: '≈100', description: 'Low-cost text-only package using economy/free models.' },
  pro: { name: 'Pro', bd: 500, intl: '$7.99', tokens: '1M', messages: '≈300', description: 'Regular AI use with premium provider models.' },
  pro_max: { name: 'Pro Max', bd: 1000, intl: '$14.99', tokens: '3M', messages: '≈800', description: 'More tokens for heavier AI use.' },
  ultra: { name: 'Ultra', bd: 1500, intl: '$24.99', tokens: '6M', messages: '≈1,500', description: 'Maximum package for heavy users.' },
};

export default function UpgradeEnhancements() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanId>('pro');
  const [bkash, setBkash] = useState('');
  const [transaction, setTransaction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sync = () => setOpen(Boolean(document.querySelector('.planModal')));
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const original = document.querySelector('.planModal') as HTMLElement | null;
    if (original) original.style.visibility = 'hidden';
    return () => { if (original) original.style.visibility = ''; };
  }, [open]);

  function close() {
    setOpen(false);
    (document.querySelector('.planModal .modalClose') as HTMLButtonElement | null)?.click();
    setMessage('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!supabase) return setMessage('Supabase is not configured.');
    if (!bkash.trim() || !transaction.trim()) return setMessage('Enter the bKash number you paid from and the transaction ID.');
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return setMessage('Please sign in before purchasing a package.'); }
    const selected = PLANS[plan];
    const { data: existing } = await supabase.from('payment_requests').select('id').eq('user_id', user.id).eq('status', 'pending').eq('plan', plan).maybeSingle();
    if (existing) { setSubmitting(false); return setMessage('You already have a pending request for this package.'); }
    const { error } = await supabase.from('payment_requests').insert({ user_id: user.id, user_email: user.email, plan, amount: selected.bd, currency: 'BDT', bkash_number: bkash.trim(), transaction_id: transaction.trim(), status: 'pending' });
    setSubmitting(false);
    if (error) return setMessage(error.message);
    setMessage('Payment submitted. Admin will verify your bKash transaction and activate the package within 24 hours.');
    setBkash('');
    setTransaction('');
  }

  if (!open) return null;
  const selected = PLANS[plan];
  return <div className="upgradeEnhanceBackdrop" role="dialog" aria-modal="true">
    <div className="upgradeEnhanceModal">
      <button className="upgradeEnhanceClose" onClick={close} aria-label="Close">×</button>
      <div className="upgradeEnhanceHeader"><span className="upgradeEyebrow">SUDOAI PACKAGES</span><h2>Choose a package</h2><p>Manual bKash activation. Submit your transaction ID and we'll verify it within 24 hours.</p></div>
      <div className="upgradeEnhanceGrid">{(Object.entries(PLANS) as [PlanId, typeof selected][]).map(([id, p]) => <button key={id} className={'upgradePackage '+(plan===id?'selected':'')} onClick={() => { setPlan(id); setMessage(''); }}><div><strong>{p.name}</strong>{id==='pro'&&<em>POPULAR</em>}</div><b>৳{p.bd}</b><small>{p.messages} messages · {p.tokens} tokens</small><span>{p.description}</span><i>International {p.intl}</i></button>)}</div>
      <form onSubmit={submit} className="bkashForm">
        <div className="selectedPackage"><div><small>Selected package</small><strong>{selected.name}</strong></div><b>৳{selected.bd}</b></div>
        <div className="paymentNote"><strong>Manual bKash payment</strong><span>Pay ৳{selected.bd}, then enter the bKash number you paid from and the transaction ID below.</span></div>
        <label>bKash number<input inputMode="tel" value={bkash} onChange={e=>setBkash(e.target.value)} placeholder="01XXXXXXXXX" required /></label>
        <label>Transaction ID<input value={transaction} onChange={e=>setTransaction(e.target.value)} placeholder="Enter bKash transaction ID" required /></label>
        {message && <div className={message.startsWith('Payment submitted')?'success':'formError'}>{message}</div>}
        <button className="submitPayment" disabled={submitting}>{submitting?'Submitting…':'Submit payment for review'}</button>
        <small className="reviewNote">Your package stays pending until an admin verifies the transaction. Approval target: within 24 hours.</small>
      </form>
    </div>
    <style jsx>{`.upgradeEnhanceBackdrop{position:fixed;inset:0;z-index:99999;background:rgba(2,8,20,.72);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:28px;overflow:auto}.upgradeEnhanceModal{position:relative;width:min(1050px,96vw);max-height:92vh;overflow:auto;background:#0e1828;border:1px solid #263852;border-radius:26px;box-shadow:0 30px 90px #0008;padding:30px;color:#f6f8fc}.upgradeEnhanceClose{position:absolute;right:18px;top:16px;border:0;background:#18263a;color:#fff;border-radius:12px;width:38px;height:38px;font-size:25px;cursor:pointer}.upgradeEnhanceHeader{padding-right:55px;margin-bottom:22px}.upgradeEyebrow{font-size:11px;letter-spacing:.16em;color:#6ea8ff;font-weight:800}.upgradeEnhanceHeader h2{font-size:30px;margin:7px 0}.upgradeEnhanceHeader p{color:#aab8cc;margin:0;max-width:720px}.upgradeEnhanceGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:22px 0}.upgradePackage{text-align:left;border:1px solid #2a3a53;background:#111e31;color:#fff;border-radius:18px;padding:18px;cursor:pointer;min-height:165px}.upgradePackage.selected{border-color:#4c8dff;box-shadow:0 0 0 2px #4c8dff33}.upgradePackage div{display:flex;justify-content:space-between;gap:8px;align-items:center}.upgradePackage strong{font-size:17px}.upgradePackage em{font-style:normal;font-size:9px;background:#2b6be8;padding:4px 7px;border-radius:999px}.upgradePackage>b{display:block;font-size:24px;margin:13px 0 5px}.upgradePackage small,.upgradePackage span,.upgradePackage i{display:block;color:#aebbd0;font-size:12px;line-height:1.45}.upgradePackage i{margin-top:9px;font-style:normal;color:#7faef8}.bkashForm{border-top:1px solid #263852;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.selectedPackage,.paymentNote,.submitPayment,.reviewNote,.formError,.success{grid-column:1/-1}.selectedPackage{display:flex;justify-content:space-between;align-items:center;background:#132238;border:1px solid #2a3a53;border-radius:14px;padding:14px 16px}.selectedPackage small,.selectedPackage strong{display:block}.selectedPackage small{color:#8ea0b8;font-size:11px}.selectedPackage strong{font-size:17px;margin-top:3px}.selectedPackage>b{font-size:20px}.paymentNote{display:flex;flex-direction:column;gap:4px;background:#10253c;border:1px solid #24476d;border-radius:14px;padding:13px 15px}.paymentNote span{font-size:12px;color:#aebbd0}.bkashForm label{font-size:12px;color:#aebbd0}.bkashForm input{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:13px 14px;border-radius:11px;border:1px solid #30445f;background:#0a1423;color:#fff;outline:none}.submitPayment{border:0;border-radius:12px;padding:14px;background:#3b82f6;color:#fff;font-weight:800;font-size:14px;cursor:pointer}.submitPayment:disabled{opacity:.6}.reviewNote{font-size:11px;color:#8fa0b8;text-align:center}.formError{background:#351b22;color:#ffb4bd;border:1px solid #6e303b;border-radius:10px;padding:11px;font-size:12px}.success{background:#123223;color:#a8efc1;border:1px solid #246442;border-radius:10px;padding:11px;font-size:12px}@media(max-width:800px){.upgradeEnhanceBackdrop{padding:10px}.upgradeEnhanceModal{padding:22px;border-radius:20px}.upgradeEnhanceGrid{grid-template-columns:1fr 1fr}.bkashForm{grid-template-columns:1fr}}@media(max-width:520px){.upgradeEnhanceGrid{grid-template-columns:1fr}.upgradeEnhanceHeader h2{font-size:24px}}`}</style>
  </div>;
}
