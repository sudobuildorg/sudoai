# SudoAI CLI

SudoAI CLI is the first terminal client for SudoAI. It lets you ask SudoAI questions from a project directory and gives the model controlled access to inspect files, list folders, and run terminal commands with confirmation.

> **MVP note:** this first release is intentionally conservative. File editing and authenticated CLI login are planned next. Do not treat the current CLI as the final Claude Code/Codex replacement yet.

## Requirements

- Node.js 18 or newer
- A SudoAI deployment reachable from your computer
- `SUDOAI_API_KEY` when authenticated CLI access is enabled on your deployment

## Run from the repository

```bash
cd cli
npm start
```

Or:

```bash
node cli/src/index.mjs
```

## One-shot mode

```bash
node cli/src/index.mjs "explain this project"
node cli/src/index.mjs "find the authentication bug"
```

## Configuration

By default the CLI uses:

```text
https://sudoai.vercel.app
```

Override it with:

```bash
export SUDOAI_API_URL=https://your-sudoai-domain.example
```

Set the API key:

```bash
export SUDOAI_API_KEY="your-cli-api-key"
```

Optionally select a model:

```bash
export SUDOAI_MODEL="llama-3.1-8b-instant"
```

Never commit API keys to Git.

## Current tools

The agent can request:

- `read_file <path>` — read a workspace file
- `list <path>` — list a directory
- `run <command>` — execute a shell command after asking for confirmation

Commands run with the current directory as the workspace.

The CLI blocks file paths outside the current workspace.

## Safety

The CLI asks for confirmation before every shell command. This is intentional. A future release will add finer-grained permissions for edits, destructive commands, Git operations, and autonomous mode.

## Commands

```text
sudo                 Start interactive mode
sudo "request"       Run a single request
sudo --help          Show help
exit                 Leave interactive mode
```

## Troubleshooting

### `SudoAI returned an empty response`

Check that your SudoAI deployment is running and that `/api/chat` is reachable.

### Provider/API error

Check the provider configuration in the SudoAI server and your selected model.

### `fetch failed`

Check your internet connection and `SUDOAI_API_URL`.
