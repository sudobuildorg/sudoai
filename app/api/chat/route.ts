import { NextRequest, NextResponse } from 'next/server';

type Provider = 'groq' | 'openai' | 'anthropic';

function providerFromName(value: unknown): Provider {
  return value === 'openai' || value === 'anthropic' ? value : 'groq';
}

export async function POST(req: NextRequest) {
  try {
    const { messages, provider: providerValue = 'groq', model } = await req.json();
    if (!Array.isArray(messages)) return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });

    const provider = providerFromName(providerValue);
    const actualModel = typeof model === 'string' && model.trim() ? model.trim() : provider === 'groq' ? 'llama-3.1-8b-instant' : provider === 'openai' ? 'gpt-5.6' : 'claude-sonnet-4-5';
    const apiKey = provider === 'openai' ? process.env.OPENAI_API_KEY : provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.GROQ_API_KEY;
    const providerLabel = provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Groq';
    if (!apiKey) return NextResponse.json({ error: `${providerLabel} API key is not configured.` }, { status: 500 });

    let response: Response;
    if (provider === 'anthropic') {
      const system = messages.find((m: { role?: string }) => m.role === 'system')?.content;
      const chatMessages = messages.filter((m: { role?: string }) => m.role !== 'system').map((m: { role: string; content: string }) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: actualModel, max_tokens: 2048, ...(system ? { system } : {}), messages: chatMessages }),
      });
    } else {
      const endpoint = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: actualModel, messages, temperature: 0.7, max_tokens: 2048 }),
      });
    }

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || `${providerLabel} API request failed.` }, { status: response.status });
    const message = provider === 'anthropic' ? data.content?.filter((b: { type?: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n') || '' : data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ message, usage: data.usage || null, model: data.model || actualModel, provider: providerLabel, modelLabel: data.model || actualModel });
  } catch (error) {
    console.error('SudoAI chat error:', error);
    return NextResponse.json({ error: 'Unable to contact the AI service.' }, { status: 500 });
  }
}
