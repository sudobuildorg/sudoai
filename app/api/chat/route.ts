import { NextRequest, NextResponse } from 'next/server';

const MODELS = {
  groq: { model: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', provider: 'Groq' },
  openai: { model: 'gpt-5.6', label: 'GPT-5.6', provider: 'OpenAI' },
} as const;

export async function POST(req: NextRequest) {
  try {
    const { messages, provider = 'groq', model } = await req.json();
    if (!Array.isArray(messages)) return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
    const selected = provider === 'openai' ? MODELS.openai : MODELS.groq;
    const apiKey = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: `${selected.provider} API key is not configured.` }, { status: 500 });
    const actualModel = model || selected.model;
    const endpoint = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: actualModel, messages, temperature: 0.7, max_tokens: 2048 }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || `${selected.provider} API request failed.` }, { status: response.status });
    return NextResponse.json({ message: data.choices?.[0]?.message?.content || '', usage: data.usage || null, model: data.model || actualModel, provider: selected.provider, modelLabel: selected.label });
  } catch (error) {
    console.error('SudoAI chat error:', error);
    return NextResponse.json({ error: 'Unable to contact the AI service.' }, { status: 500 });
  }
}
