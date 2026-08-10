'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LogoutButton() {
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSignedIn(Boolean(session));
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!signedIn) return null;

  async function logout() {
    if (!supabase || busy) return;
    setBusy(true);
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return <button className="sudoLogout" onClick={logout} disabled={busy} aria-label="Log out">
    <span aria-hidden="true">↪</span>{busy ? 'Logging out…' : 'Log out'}
    <style jsx>{`
      .sudoLogout{position:fixed;left:18px;bottom:18px;z-index:9998;display:flex;align-items:center;gap:8px;border:1px solid #2b3d57;background:#101d30;color:#dbe7f7;border-radius:11px;padding:10px 14px;font:600 13px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px #0005;transition:.15s ease}
      .sudoLogout:hover{background:#182941;border-color:#416083;transform:translateY(-1px)}
      .sudoLogout:disabled{opacity:.6;cursor:wait;transform:none}
      @media(max-width:700px){.sudoLogout{left:auto;right:14px;bottom:76px;padding:9px 12px}}
    `}</style>
  </button>;
}
