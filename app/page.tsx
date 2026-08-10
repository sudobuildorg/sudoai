'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';

const starterChats = ['What is SudoAI?', 'Explain quantum computing', 'Best practices for Next.js', 'How does AI work?', 'JavaScript array methods'];
const FREE_LIMIT = 20;

type Chat = { id: string; title: string; model?: string | null };
type Profile = { display_name: string | null; plan: 'free' | 'pro' };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({ display_name: null, plan: 'free' });
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<{role: string; content: string}[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [usage, setUsage] = useState(0);
  const [showUsage, setShowUsage] = useState(false);

  const displayName = useMemo(() => profile.display_name || user?.email?.split('@')[0] || 'Guest', [profile, user]);

  async function refreshUserData(currentUser: User) {
    if (!supabase) return;
    const [{ data: p }, { data: c }, { data: u }] = await Promise.all([
      supabase.from('profiles').select('display_name,plan').eq('id', currentUser.id).maybeSingle(),
      supabase.from('conversations').select('id,title,model').eq('user_id', currentUser.id).order('updated_at', { ascending: false }),
      supabase.from('usage_daily').select('message_count').eq('user_id', currentUser.id).eq('usage_date', new Date().toISOString().slice(0,10)).maybeSingle()
    ]);
    if (p) setProfile(p);
    setChats(c || []);
    setUsage(u?.message_count || 0);
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) await refreshUserData(data.session.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) await refreshUserData(session.user);
      else { setChats([]); setUsage(0); setProfile({ display_name: null, plan: 'free' }); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function authenticate(e: React.FormEvent) {
    e.preventDefault(); setAuthError('');
    if (!supabase) return setAuthError('Supabase is not configured in Vercel.');
    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name || email.split('@')[0] } } });
      if (error) return setAuthError(error.message);
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, display_name: name || email.split('@')[0], plan: 'free' });
        if (!data.session) setAuthError('Account created. Check your email to confirm your account.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setAuthError(error.message);
      setAuthOpen(false);
    }
  }

  async function signOut() { await supabase?.auth.signOut(); setActiveChat(null); setMessages([]); }

  async function openChat(id: string) {
    if (!supabase || !user) return;
    setActiveChat(id);
    const { data } = await supabase.from('messages').select('role,content').eq('conversation_id', id).order('created_at', { ascending: true });
    setMessages(data || []);
  }

  async function sendMessage(text = message) {
    const content = text.trim();
    if (!content) return;
    if (!user) { setAuthOpen(true); return; }
    if (profile.plan === 'free' && usage >= FREE_LIMIT) { setShowUsage(true); return; }
    if (!supabase) return;
    let conversationId = activeChat;
    if (!conversationId) {
      const { data: c } = await supabase.from('conversations').insert({ user_id: user.id, title: content.slice(0, 60), model: 'SudoAI 1.0' }).select('id,title,model').single();
      if (!c) return;
      conversationId = c.id; setActiveChat(c.id); setChats(prev => [c, ...prev]);
    }
    await supabase.from('messages').insert({ conversation_id: conversationId, user_id: user.id, role: 'user', content });
    setMessages(prev => [...prev, { role: 'user', content }, { role: 'assistant', content: 'Your AI API is not connected yet. This message was saved successfully. Connect the API endpoint next to enable real AI responses.' }]);
    await supabase.from('messages').insert({ conversation_id: conversationId, user_id: user.id, role: 'assistant', content: 'Your AI API is not connected yet. This message was saved successfully. Connect the API endpoint next to enable real AI responses.' });
    await supabase.from('usage_daily').upsert({ user_id: user.id, usage_date: new Date().toISOString().slice(0,10), message_count: usage + 1 });
    setUsage(v => v + 1); setMessage('');
  }

  if (loading) return <div className="loadingScreen">Loading SudoAI…</div>;

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><b>sudo<span>ai</span></b></div>
      <button className="newChat" onClick={() => {setActiveChat(null);setMessages([])}}>＋ New Chat <span>⌘ K</span></button>
      <input className="search" placeholder="Search chats..." />
      <div className="section">{user ? 'Your chats' : 'Preview'}</div>
      <div className="chatList">{(user ? chats : starterChats.map((title, i) => ({ id: `starter-${i}`, title }))).map(c => <button key={c.id} className={'chat '+(activeChat===c.id?'active':'')} onClick={() => user ? openChat(c.id) : setMessage(c.title)}>◯ {c.title}<small>•••</small></button>)}</div>
      {user && <div className="usageCard"><div><b>Daily usage</b><span>{profile.plan === 'pro' ? 'Pro' : `${usage}/${FREE_LIMIT}`}</span></div><div className="meter"><i style={{width: profile.plan === 'pro' ? '100%' : `${Math.min(100, usage/FREE_LIMIT*100)}%`}} /></div><button onClick={()=>setShowUsage(true)}>View usage</button></div>}
      <div className="upgrade"><b>♛ {profile.plan === 'pro' ? 'SudoAI Pro' : 'Upgrade to Pro'}</b><p>{profile.plan === 'pro' ? 'You have Pro access.' : 'Higher limits, faster responses and more.'}</p><button>Upgrade now ↗</button></div>
      {user ? <button className="account" onClick={signOut}><div className="avatar">{displayName[0]?.toUpperCase()}</div><div><b>{displayName}</b><small>{profile.plan.toUpperCase()} · Sign out</small></div><span>↪</span></button> : <button className="account" onClick={()=>setAuthOpen(true)}><div className="avatar">S</div><div><b>Sign in</b><small>Save your chats</small></div><span>→</span></button>}
    </aside>
    <section className="main"><header><b>{activeChat ? (chats.find(c=>c.id===activeChat)?.title || 'Chat') : 'SudoAI'}</b><div className="headerRight"><label>Model</label><select><option>SudoAI 1.0</option></select><button>☾</button></div></header>
      <div className="conversation">
        {!user && <div className="welcome"><h1>Welcome to <span>SudoAI</span></h1><p>Sign in to save conversations and track your usage.</p><button onClick={()=>setAuthOpen(true)}>Get started →</button></div>}
        {messages.map((m,i)=><div className={m.role==='user'?'userBubble':'answer'} key={i}>{m.role==='assistant' && <div className="aiAvatar">ai</div>}<div><p>{m.content}</p></div></div>)}
        {messages.length===0 && <div className="answer"><div className="aiAvatar">ai</div><div><p><b>SudoAI</b> is ready. Ask a question to start your conversation.</p><p>{user ? 'Your chats and daily usage will be saved to your SudoAI account.' : 'Sign in to unlock chat history and usage tracking.'}</p></div></div>}
        <div className="prompts"><button onClick={()=>sendMessage('What can you do?')}>⚡ What can you do?</button><button onClick={()=>sendMessage('Help me write')}>✎ Help me write</button><button onClick={()=>sendMessage('Explain a concept')}>▣ Explain a concept</button><button onClick={()=>sendMessage('Give me ideas')}>♧ Give me ideas</button></div>
        <div className="composer"><textarea value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} placeholder={user ? 'Ask anything...' : 'Sign in to start chatting...'}/><div className="composeBottom"><span>{user ? `${usage}/${profile.plan==='pro'?'∞':FREE_LIMIT} today` : 'Guest mode'}</span><div><select><option>SudoAI 1.0</option></select><button onClick={()=>sendMessage()}>➤</button></div></div></div>
        <p className="disclaimer">SudoAI can make mistakes. Please verify important information.</p>
      </div>
    </section>
    {authOpen && <div className="modalBackdrop"><form className="authModal" onSubmit={authenticate}><button type="button" className="close" onClick={()=>setAuthOpen(false)}>×</button><div className="modalLogo">sudo<span>ai</span></div><h2>{authMode==='login'?'Welcome back':'Create your SudoAI account'}</h2><p>{authMode==='login'?'Sign in to continue.':'Start with the SudoAI free plan.'}</p>{authMode==='signup' && <input value={name} onChange={e=>setName(e.target.value)} placeholder="Display name" required/>}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min. 6 characters)" minLength={6} required/>{authError && <div className="authError">{authError}</div>}<button className="authSubmit">{authMode==='login'?'Sign in':'Create account'}</button><button type="button" className="switchAuth" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('')}}>{authMode==='login'?'Create a new account':'Already have an account? Sign in'}</button></form></div>}
    {showUsage && <div className="modalBackdrop" onClick={()=>setShowUsage(false)}><div className="usageModal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowUsage(false)}>×</button><h2>Usage</h2><p>Today</p><div className="bigUsage">{profile.plan==='pro' ? usage : `${usage} / ${FREE_LIMIT}`}</div><p>{profile.plan==='pro' ? 'Pro plan — no daily message cap configured.' : `${Math.max(0,FREE_LIMIT-usage)} messages remaining on the Free plan.`}</p><button className="authSubmit" onClick={()=>setShowUsage(false)}>Done</button></div></div>}
  </main>;
}
