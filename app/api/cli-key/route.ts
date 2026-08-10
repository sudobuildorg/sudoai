import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function adminClient() {
  if (!url || !serviceKey) throw new Error('Supabase server configuration is missing.');
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getUser(req: NextRequest) {
  if (!url || !publishableKey) throw new Error('Supabase configuration is missing.');
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const client = createClient(url, publishableKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data } = await client.auth.getUser();
  return data.user || null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = adminClient();
    const { data, error } = await db.from('cli_api_keys').select('id,token_prefix,created_at,last_used_at,revoked_at').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ keys: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load CLI keys.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = adminClient();
    const token = `sai_${randomBytes(32).toString('base64url')}`;
    const prefix = token.slice(0, 12);
    const { error } = await db.from('cli_api_keys').insert({ user_id: user.id, token_hash: hashToken(token), token_prefix: prefix });
    if (error) throw error;
    return NextResponse.json({ token, prefix });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create CLI key.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'Key id is required.' }, { status: 400 });
    const db = adminClient();
    const { error } = await db.from('cli_api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).is('revoked_at', null);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to revoke CLI key.' }, { status: 500 });
  }
}
