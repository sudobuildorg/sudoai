export const metadata = { title: 'SudoAI CLI Documentation', description: 'User documentation for the SudoAI coding agent CLI.' };

const card = { border: '1px solid #1d2631', background: '#0c1118', borderRadius: 18, padding: '26px 28px' };
const code = { background: '#05070a', border: '1px solid #202833', padding: 18, borderRadius: 12, overflowX: 'auto' as const, color: '#dce4ee' };

export default function CLIDocs() {
  return (
    <main style={{ minHeight: '100vh', background: '#070a0f', color: '#f5f7fa', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '56px 24px 100px' }}>
        <a href="/" style={{ color: '#a8b3c2', textDecoration: 'none' }}>← Back to SudoAI</a>
        <div style={{ marginTop: 48 }}>
          <div style={{ display: 'inline-flex', padding: '7px 12px', border: '1px solid #26303c', borderRadius: 999, color: '#9ba8b8', fontSize: 13 }}>SudoAI Developer Tools</div>
          <h1 style={{ fontSize: 'clamp(38px,7vw,64px)', lineHeight: 1.05, margin: '20px 0 16px', letterSpacing: '-2px' }}>SudoAI CLI</h1>
          <p style={{ fontSize: 20, lineHeight: 1.6, color: '#aeb8c6', maxWidth: 720 }}>Run the SudoAI coding agent directly from your terminal and work on your local project with permission-controlled tools.</p>
        </div>

        <div style={{ marginTop: 42, display: 'grid', gap: 18 }}>
          <section style={card}><h2>Requirements</h2><p>Node.js 18+, internet access, a reachable SudoAI deployment, and SUDOAI_API_KEY when your deployment requires authenticated CLI access.</p></section>
          <section style={card}><h2>Run SudoAI CLI</h2><pre style={code}><code>{`git clone https://github.com/sudobuildorg/sudoai.git\ncd sudoai/cli\nnpm start`}</code></pre><p>Or run directly with <code>node src/index.mjs</code>. One-shot mode: <code>node src/index.mjs "find the authentication bug"</code>.</p></section>
          <section style={card}><h2>Configuration</h2><p>Default API: <code>https://sudoai.vercel.app</code></p><pre style={code}><code>{`export SUDOAI_API_URL="https://your-domain.example"\nexport SUDOAI_API_KEY="YOUR_KEY"\nexport SUDOAI_MODEL="llama-3.1-8b-instant"`}</code></pre><p>Never commit secrets to GitHub.</p></section>
          <section style={card}><h2>Use it in a project</h2><p>Start the CLI from the project you want the agent to inspect:</p><pre style={code}><code>{`cd ~/projects/my-app\nsudo`}</code></pre><p>Then ask it to inspect code, find bugs, make fixes, and run tests.</p></section>
          <section style={card}><h2>Local agent tools</h2><p>The CLI can read files, list directories, write files, and run shell commands. These operations happen on the user's computer, not on the SudoAI server.</p></section>
          <section style={card}><h2>Safety</h2><p>The MVP asks for confirmation before every file write and shell command. File paths outside the current workspace are blocked. Do not approve commands you do not understand.</p></section>
          <section style={card}><h2>Useful prompts</h2><ul><li>inspect this project structure</li><li>find the authentication bug</li><li>explain this error</li><li>review the latest git diff</li><li>fix the failing test</li><li>run the tests and summarize failures</li><li>refactor this component</li></ul></section>
          <section style={card}><h2>Current scope</h2><p>Interactive terminal chat, one-shot requests, workspace-aware file reads, directory listing, file creation/replacement with confirmation, shell commands with confirmation, and provider/model routing through SudoAI.</p></section>
          <section style={card}><h2>Troubleshooting</h2><p><strong>Empty response:</strong> check that the deployment and <code>/api/chat</code> are reachable.</p><p><strong>Fetch failed:</strong> check your internet connection and <code>SUDOAI_API_URL</code>.</p><p><strong>Authentication error:</strong> set <code>SUDOAI_API_KEY</code> when authentication is enabled.</p><p><strong>Command denied:</strong> approve the command with <code>y</code> when you trust it.</p></section>
        </div>
        <footer style={{ marginTop: 42, color: '#6f7b89', fontSize: 13 }}>SudoAI · CLI documentation</footer>
      </div>
    </main>
  );
}
