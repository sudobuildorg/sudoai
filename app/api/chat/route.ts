import { NextRequest, NextResponse } from 'next/server';

const MODELS = {
  groq: { model: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', provider: 'Groq' },
  openai: { model: 'gpt-5.6', label: 'GPT-5.6', provider: 'OpenAI' },
  anthropic: { model: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'Anthropic' },
} as const;

type Provider = keyof typeof MODELS;

export async function POST(req: NextRequest) {
  try {
    const { messages, provider = 'groq', model } = await req.json();
    if (!Array.isArray(messages)) return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
    const selectedProvider: Provider = provider === 'openai' || provider === 'anthropic' ? provider : 'groq';
    const selected = MODELS[selectedProvider];
    const apiKey = selectedProvider === 'openai' ? process.env.OPENAI_API_KEY : selectedProvider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: `${selected.provider} API key is not configured.` }, { status: 500 });
    const actualModel = model || selected.model;

    let response: Response;
    if (selectedProvider === 'anthropic') {
      const system = messages.find((m: { role?: string }) => m.role === 'system')?.content;
      const chatMessages = messages.filter((m: { role?: string }) => m.role !== 'system').map((m: { role: string; content: string }) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: actualModel, max_tokens: 2048, ...(system ? { system } : {}), messages: chatMessages }),
      });
    } else {
      const endpoint = selectedProvider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: actualModel, messages, temperature: 0.7, max_tokens: 2048 }) });
    }

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || `${selected.provider} API request failed.` }, { status: response.status });
    const message = selectedProvider === 'anthropic' ? data.content?.filter((b: { type?: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n') || '' : data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ message, usage: data.usage || null, model: data.model || actualModel, provider: selected.provider, modelLabel: selected.label });
  } catch (error) {
    console.error('SudoAI chat error:', error);
    return NextResponse.json({ error: 'Unable to contact the AI service.' }, { status: 500 });
  }
}
