import { NextResponse } from 'next/server';

type Provider = 'Groq' | 'OpenAI' | 'Anthropic';
type Model = { id: string; label: string; provider: Provider };

function labelFor(id: string) {
  return id
    .split(/[\/_-]/)
    .filter(Boolean)
    .map((p) => p.length <= 3 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
    .replace(/\bGpt\b/g, 'GPT')
    .replace(/\bLlama\b/g, 'Llama');
}

async function list(url: string, key: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${key}`, ...headers }, cache: 'no-store' });
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data?.data) ? data.data : [];
}

export async function GET() {
  const models: Model[] = [];
  const tasks: Promise<void>[] = [];

  if (process.env.GROQ_API_KEY) tasks.push((async () => {
    const data = await list('https://api.groq.com/openai/v1/models', process.env.GROQ_API_KEY!);
    for (const m of data) {
      const id = String(m.id || '');
      if (!id || /whisper|guard|embed|moderation|audio/i.test(id)) continue;
      models.push({ id, label: m.id === 'llama-3.1-8b-instant' ? 'Llama 3.1 8B Instant' : labelFor(id), provider: 'Groq' });
    }
  })());

  if (process.env.OPENAI_API_KEY) tasks.push((async () => {
    const data = await list('https://api.openai.com/v1/models', process.env.OPENAI_API_KEY!);
    for (const m of data) {
      const id = String(m.id || '');
      if (!id || /embedding|whisper|tts|dall-e|moderation|search|transcribe|audio/i.test(id)) continue;
      models.push({ id, label: id === 'gpt-5.6' ? 'GPT-5.6' : labelFor(id), provider: 'OpenAI' });
    }
  })());

  if (process.env.ANTHROPIC_API_KEY) tasks.push((async () => {
    const data = await list('https://api.anthropic.com/v1/models', process.env.ANTHROPIC_API_KEY!, { 'anthropic-version': '2023-06-01' });
    for (const m of data) {
      const id = String(m.id || '');
      if (!id) continue;
      const label = id === 'claude-sonnet-4-5' ? 'Claude Sonnet 4.5' : id === 'claude-opus-4-1' ? 'Claude Opus 4.1' : (m.display_name || labelFor(id));
      models.push({ id, label, provider: 'Anthropic' });
    }
  })());

  await Promise.all(tasks);

  const unique = Array.from(new Map(models.map((m) => [`${m.provider}:${m.id}`, m])).values())
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.label.localeCompare(b.label));

  if (!unique.some((m) => m.id === 'llama-3.1-8b-instant' && m.provider === 'Groq')) {
    unique.unshift({ id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', provider: 'Groq' });
  }

  return NextResponse.json({ models: unique, configuredProviders: Array.from(new Set(unique.map((m) => m.provider))) });
}
