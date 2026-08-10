# SudoAI CLI — User Documentation

SudoAI CLI is the terminal version of SudoAI. It is designed to become a coding agent that can work inside a local project, similar in workflow to modern terminal coding agents.

## 1. Install / run

The first MVP is distributed from the SudoAI repository:

```bash
git clone https://github.com/sudobuildorg/sudoai.git
cd sudoai/cli
npm start
```

You need Node.js 18+.

For a one-shot request:

```bash
node src/index.mjs "explain this project"
```

## 2. Configure SudoAI

The CLI uses the hosted SudoAI API by default:

```text
https://sudoai.vercel.app
```

You can use another deployment:

```bash
export SUDOAI_API_URL="https://your-domain.example"
```

If your deployment requires a CLI API key:

```bash
export SUDOAI_API_KEY="YOUR_KEY"
```

Keep the key private. Do not put it in source code or commit it to GitHub.

## 3. Start the agent

From your project directory:

```bash
cd ~/projects/my-app
node /path/to/sudoai/cli/src/index.mjs
```

Then ask:

```text
> inspect the authentication code and tell me what is wrong
```

The model can request local tools. For example:

```text
TOOL: list .
TOOL: read_file src/auth.ts
TOOL: run npm test
```

The CLI executes these tools locally rather than on the SudoAI server.

## 4. Command safety

Every shell command requires confirmation:

```text
⚠ SudoAI wants to run this command:

npm test

Allow? [y/N]
```

Answer `y` to execute it. Any other answer denies it.

This prevents the first MVP from silently executing arbitrary commands.

## 5. Current limitations

This first CLI release is an MVP. It currently supports:

- Interactive terminal chat
- One-shot requests
- Workspace-aware file reading
- Directory listing
- Local shell commands with confirmation
- SudoAI model/provider routing through the existing `/api/chat` endpoint

Not yet included:

- `sudo login` device authentication
- Native `npm install -g` package release
- File editing/apply-patch tool
- Git commit/push tools
- MCP
- Autonomous mode
- VS Code integration
- Server-side usage enforcement for CLI sessions

These are deliberate next steps rather than hidden functionality.

## 6. Recommended workflow

Use the CLI from the root of the repository you want SudoAI to inspect:

```bash
cd my-project
node /path/to/sudoai/cli/src/index.mjs
```

Useful prompts:

```text
inspect this project structure
find the authentication bug
explain why the tests fail
review the latest git diff
run the tests and summarize failures
```

## 7. Troubleshooting

### API error

Verify `SUDOAI_API_URL` and the SudoAI deployment.

### Authentication error

Set a valid `SUDOAI_API_KEY` when your deployment has CLI authentication enabled.

### Command denied

The CLI is intentionally confirmation-based. Run the request again and approve the command when prompted.

### Path outside workspace

The MVP only allows file reads inside the directory where the CLI was started.

## 8. Security recommendation

Do not run the CLI in a directory containing secrets if you are asking it to inspect the entire project. The agent can read files you explicitly ask it to inspect.

Before using autonomous or unrestricted modes in a future release, review the requested commands and file changes carefully.
