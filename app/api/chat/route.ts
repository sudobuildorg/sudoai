import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY is not configured.' }, { status: 500 });
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, temperature: 0.7, max_tokens: 1024 }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || 'Groq API request failed.' }, { status: response.status });
    return NextResponse.json({ message: data.choices?.[0]?.message?.content || '', usage: data.usage || null, model: data.model || 'llama-3.1-8b-instant' });
  } catch (error) {
    console.error('SudoAI chat error:', error);
    return NextResponse.json({ error: 'Unable to contact the AI service.' }, { status: 500 });
  }
}
