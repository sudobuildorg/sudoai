import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Provider = { id: string; name: string; keyEnv: string; endpoint: string; configured: boolean; status: 'online'|'offline'|'not_configured'; balance: string; note: string };

const providers = [
  { id: 'groq', name: 'Groq', keyEnv: 'GROQ_API_KEY', endpoint: 'https://api.groq.com/openai/v1/models' },
  { id: 'openai', name: 'OpenAI', keyEnv: 'OPENAI_API_KEY', endpoint: 'https://api.openai.com/v1/models' },
  { id: 'anthropic', name: 'Anthropic', keyEnv: 'ANTHROPIC_API_KEY', endpoint: 'https://api.anthropic.com/v1/models' },
  { id: 'google', name: 'Google Gemini', keyEnv: 'GEMINI_API_KEY', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },
];

async function isAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return false;
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user } } = await client.auth.getUser(token);
  if (!user) return false;
  const { data } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  return Boolean(data);
}

async function checkProvider(p: typeof providers[number]): Promise<Provider> {
  const apiKey = process.env[p.keyEnv];
  if (!apiKey) return { ...p, configured: false, status: 'not_configured', balance: '—', note: 'API key is not configured.' };
  try {
    const headers: Record<string,string> = { Accept: 'application/json' };
    if (p.id === 'anthropic') { headers['x-api-key'] = apiKey; headers['anthropic-version'] = '2023-06-01'; }
    else if (p.id === 'google') { /* Gemini authenticates this request with the query key below. */ }
    else headers.Authorization = `Bearer ${apiKey}`;
    const url = p.id === 'google' ? `${p.endpoint}?key=${encodeURIComponent(apiKey)}` : p.endpoint;
    const response = await fetch(url, { headers, cache: 'no-store' });
    if (!response.ok) return { ...p, configured: true, status: 'offline', balance: '—', note: `API check returned HTTP ${response.status}.` };
    return { ...p, configured: true, status: 'online', balance: 'Not exposed by API', note: 'Key works. Provider billing/quota balance must be read from the provider billing console.' };
  } catch (error) {
    return { ...p, configured: true, status: 'offline', balance: '—', note: error instanceof Error ? error.message : 'Connection failed.' };
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const results = await Promise.all(providers.map(checkProvider));
  return NextResponse.json({ providers: results, checkedAt: new Date().toISOString() });
}
