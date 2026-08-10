#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const API_URL = (process.env.SUDOAI_API_URL || 'https://sudoai.vercel.app').replace(/\/$/, '');
const API_KEY = process.env.SUDOAI_API_KEY || '';
const MODEL = process.env.SUDOAI_MODEL || '';
const cwd = process.cwd();

function usage() {
  console.log(`\nSudoAI CLI — terminal AI assistant\n\nUsage:\n  sudo                    Start interactive mode\n  sudo "your request"     Run one request\n  sudo --help             Show help\n\nEnvironment:\n  SUDOAI_API_URL           SudoAI server URL (default: https://sudoai.vercel.app)\n  SUDOAI_API_KEY           SudoAI API key\n  SUDOAI_MODEL             Optional model id\n\nExamples:\n  SUDOAI_API_KEY=... sudo\n  sudo "explain this project"\n  sudo "find the authentication bug"\n`);
}

async function toolReadFile(path) {
  const target = resolve(cwd, path);
  if (!target.startsWith(cwd)) throw new Error('Path is outside the current workspace.');
  return readFile(target, 'utf8');
}

async function toolList(path = '.') {
  const target = resolve(cwd, path);
  if (!target.startsWith(cwd)) throw new Error('Path is outside the current workspace.');
  const entries = await readdir(target, { withFileTypes: true });
  return entries.map(e => `${e.isDirectory() ? 'dir ' : 'file'} ${relative(cwd, join(target, e.name))}`).join('\n');
}

async function toolRun(command) {
  const answer = await execAsync(command, { cwd, maxBuffer: 1024 * 1024 * 4 });
  return [answer.stdout, answer.stderr].filter(Boolean).join('\n').slice(0, 30000);
}

async function requestSudoAI(messages) {
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, ...(MODEL ? { model: MODEL } : {}) })
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error(data?.error || raw || `SudoAI request failed (${response.status})`);
  if (!data?.message) throw new Error('SudoAI returned an empty response.');
  return data;
}

async function askConfirmation(action, detail) {
  const rl = createInterface({ input, output });
  const answer = await rl.question(`\n⚠ SudoAI wants to ${action}:\n\n${detail}\n\nAllow? [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

function systemPrompt() {
  return `You are SudoAI Code, a terminal coding assistant. The workspace is ${cwd}.\nYou can inspect files and reason about code. When you need a local action, output exactly one tool request in this form on its own line:\nTOOL:read_file <path>\nTOOL:list <path>\nTOOL:run <shell command>\nAfter receiving the tool result, continue. Never claim you changed a file unless a local write tool was actually executed. For destructive or mutating shell commands, ask the user for confirmation before execution.`;
}

async function runAgent(prompt) {
  const messages = [
    { role: 'system', content: systemPrompt() },
    { role: 'user', content: prompt }
  ];
  for (let turn = 0; turn < 8; turn++) {
    const data = await requestSudoAI(messages);
    const text = data.message;
    const tool = text.match(/^TOOL:(read_file|list|run)\s+([\s\S]+)$/m);
    if (!tool) return data;
    const name = tool[1];
    const arg = tool[2].trim();
    let result;
    try {
      if (name === 'read_file') result = await toolReadFile(arg);
      else if (name === 'list') result = await toolList(arg);
      else {
        const allowed = await askConfirmation('run this command', arg);
        result = allowed ? await toolRun(arg) : 'User denied command execution.';
      }
    } catch (error) { result = `Tool error: ${error instanceof Error ? error.message : String(error)}`; }
    messages.push({ role: 'assistant', content: text });
    messages.push({ role: 'user', content: `TOOL RESULT (${name}):\n${result}` });
  }
  return { message: 'I reached the maximum tool steps for this request.' };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return usage();
  if (!API_KEY) console.log('ℹ No SUDOAI_API_KEY set. The current SudoAI server may still accept requests, but authenticated CLI access will be required in the production agent release.');
  const oneShot = args.filter(a => !a.startsWith('--')).join(' ').trim();
  console.log(`\nSudoAI Code · ${cwd}\n`);
  if (oneShot) {
    const data = await runAgent(oneShot);
    console.log(`\n${data.message}\n`);
    return;
  }
  const rl = createInterface({ input, output });
  try {
    while (true) {
      const prompt = await rl.question('> ');
      if (!prompt.trim()) continue;
      if (['exit', 'quit', '/exit'].includes(prompt.trim().toLowerCase())) break;
      try {
        const data = await runAgent(prompt);
        console.log(`\n${data.message}\n`);
      } catch (error) {
        console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }
  } finally { rl.close(); }
}

main().catch(error => { console.error(error); process.exit(1); });
