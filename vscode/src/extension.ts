import * as vscode from 'vscode';

interface AgentResponse {
  message: string;
  model?: string;
  provider?: string;
}

type ToolCall =
  | { name: 'read_file'; path: string }
  | { name: 'list'; path?: string }
  | { name: 'search'; query: string }
  | { name: 'write_file'; path: string; content: string }
  | { name: 'run'; command: string };

const TOOL_PATTERN = /^TOOL:(read_file|list|search|write_file|run)\s+([\s\S]+)$/m;

export function activate(context: vscode.ExtensionContext) {
  const participant = vscode.chat.createChatParticipant('sudoai.code', handleChat);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
  participant.followupProvider = {
    provideFollowups: async () => [
      { prompt: 'Run the tests and fix any failures.', label: 'Run tests' },
      { prompt: 'Review the changes you made.', label: 'Review changes' }
    ]
  };
  context.subscriptions.push(participant);
}

async function handleChat(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('sudoai');
    const apiUrl = String(config.get('apiUrl', 'https://sudoai.vercel.app')).replace(/\/$/, '');
    const apiKey = String(config.get('apiKey', ''));
    const configuredModel = String(config.get('model', ''));
    const maxSteps = Math.max(1, Math.min(30, Number(config.get('maxToolSteps', 10))));
    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri;

    if (!workspace) {
      stream.markdown('Open a workspace folder first so SudoAI can work with your project.');
      return;
    }

    const history = context.history
      .filter((item): item is vscode.ChatRequestTurn | vscode.ChatResponseTurn =>
        item instanceof vscode.ChatRequestTurn || item instanceof vscode.ChatResponseTurn)
      .slice(-8)
      .map((item) => {
        if (item instanceof vscode.ChatRequestTurn) return { role: 'user', content: item.prompt };
        return { role: 'assistant', content: item.response.map((part) => part instanceof vscode.ChatResponseMarkdownPart ? part.value.value : '').join('') };
      })
      .filter((item) => item.content);

    const active = vscode.window.activeTextEditor;
    const selection = active && !active.selection.isEmpty
      ? `\nSelected code from ${vscode.workspace.asRelativePath(active.document.uri)}:\n${active.document.getText(active.selection).slice(0, 12000)}`
      : '';

    const system = `You are SudoAI Code, an agentic coding assistant running inside VS Code. Workspace root: ${workspace.fsPath}.\n\nYou can inspect and modify the local workspace using tools. Do not claim an action happened unless a tool result confirms it. Prefer small, targeted changes. Ask for confirmation through the tool protocol before mutations.\n\nAvailable tools, each on its own line:\nTOOL:read_file {"path":"relative/path"}\nTOOL:list {"path":"relative/path"}\nTOOL:search {"query":"text"}\nTOOL:write_file {"path":"relative/path","content":"complete file contents"}\nTOOL:run {"command":"shell command"}\n\nFor write_file and run, the extension will ask the user for permission. Keep tool arguments as valid JSON. After receiving TOOL RESULT messages, continue the task. Never output a tool call inside a code fence.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: system },
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: request.prompt + selection }
    ];

    for (let step = 0; step < maxSteps; step++) {
      if (token.isCancellationRequested) return;
      stream.progress(step === 0 ? 'SudoAI is inspecting your workspace…' : `Working on step ${step + 1}…`);
      const data = await callSudoAI(apiUrl, apiKey, configuredModel, messages, token);
      const text = data.message || '';
      const match = text.match(TOOL_PATTERN);
      if (!match) {
        if (data.provider || data.model) stream.markdown(`*${data.model ?? configuredModel || 'SudoAI'} · ${data.provider ?? 'SudoAI'}*\n\n`);
        stream.markdown(text);
        return;
      }

      const call = parseTool(match[1], match[2]);
      if (!call) {
        stream.markdown(text);
        return;
      }
      stream.progress(`SudoAI wants to use ${call.name}…`);
      const result = await executeTool(call, workspace);
      messages.push({ role: 'assistant', content: text });
      messages.push({ role: 'user', content: `TOOL RESULT (${call.name}):\n${result}` });
    }

    stream.markdown('I reached the configured tool-step limit. Ask me to continue if you want another pass.');
  } catch (error) {
    stream.markdown(`**SudoAI error:** ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseTool(name: string, raw: string): ToolCall | undefined {
  try {
    const value = JSON.parse(raw);
    if (name === 'read_file' && typeof value.path === 'string') return { name, path: value.path };
    if (name === 'list' && (value.path === undefined || typeof value.path === 'string')) return { name, path: value.path };
    if (name === 'search' && typeof value.query === 'string') return { name, query: value.query };
    if (name === 'write_file' && typeof value.path === 'string' && typeof value.content === 'string') return { name, path: value.path, content: value.content };
    if (name === 'run' && typeof value.command === 'string') return { name, command: value.command };
  } catch {
    return undefined;
  }
  return undefined;
}

function resolveWorkspacePath(root: vscode.Uri, relativePath: string): vscode.Uri {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const target = vscode.Uri.joinPath(root, normalized);
  const rootPath = root.fsPath.endsWith('/') ? root.fsPath : `${root.fsPath}/`;
  if (target.fsPath !== root.fsPath && !target.fsPath.startsWith(rootPath)) throw new Error('Path is outside the current workspace.');
  return target;
}

async function executeTool(call: ToolCall, root: vscode.Uri): Promise<string> {
  if (call.name === 'read_file') {
    const uri = resolveWorkspacePath(root, call.path);
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(bytes).slice(0, 50000);
  }

  if (call.name === 'list') {
    const uri = resolveWorkspacePath(root, call.path ?? '.');
    const entries = await vscode.workspace.fs.readDirectory(uri);
    return entries.map(([name, type]) => `${type === vscode.FileType.Directory ? 'dir ' : 'file'} ${name}`).join('\n');
  }

  if (call.name === 'search') {
    const results: string[] = [];
    await vscode.workspace.findTextInFiles(call.query, { include: '**/*', maxResults: 40 }, (result) => {
      if (result.preview?.text) results.push(`${vscode.workspace.asRelativePath(result.uri)}:${result.ranges[0]?.start.line + 1} ${result.preview.text.trim()}`);
    });
    return results.join('\n').slice(0, 20000) || 'No matches found.';
  }

  if (call.name === 'write_file') {
    const uri = resolveWorkspacePath(root, call.path);
    const answer = await vscode.window.showWarningMessage(`SudoAI wants to write ${vscode.workspace.asRelativePath(uri)}.`, 'Allow', 'Cancel');
    if (answer !== 'Allow') return 'User denied the file change.';
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(call.content));
    return `Wrote ${vscode.workspace.asRelativePath(uri)} successfully.`;
  }

  const answer = await vscode.window.showWarningMessage(`SudoAI wants to run:\n\n${call.command}`, 'Run', 'Cancel');
  if (answer !== 'Run') return 'User denied command execution.';
  return new Promise((resolve) => {
    const terminal = vscode.window.createTerminal({ name: 'SudoAI' });
    terminal.show(true);
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
    const args = process.platform === 'win32' ? ['/d', '/s', '/c', call.command] : ['-lc', call.command];
    const child = require('node:child_process').spawn(shell, args, { cwd: root.fsPath });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.on('close', (code: number | null) => resolve(`exit=${code ?? 'unknown'}\n${output.slice(0, 30000)}`));
    child.on('error', (error: Error) => resolve(`command error: ${error.message}`));
  });
}

async function callSudoAI(apiUrl: string, apiKey: string, model: string, messages: Array<{ role: string; content: string }>, token: vscode.CancellationToken): Promise<AgentResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const controller = new AbortController();
  const subscription = token.onCancellationRequested(() => controller.abort());
  try {
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, ...(model ? { model } : {}) }),
      signal: controller.signal
    });
    const raw = await response.text();
    let data: AgentResponse & { error?: string } | null = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    if (!response.ok) throw new Error(data?.error || raw || `SudoAI request failed (${response.status})`);
    if (!data?.message) throw new Error('SudoAI returned an empty response.');
    return data;
  } finally {
    subscription.dispose();
  }
}

export function deactivate() {}
