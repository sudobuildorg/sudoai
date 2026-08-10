# SudoAI CLI

SudoAI CLI is the terminal client for SudoAI. It lets you work with SudoAI from any project directory and gives the agent controlled access to inspect files, edit files, list folders, and run terminal commands with confirmation.

## Requirements

- Node.js 18 or newer
- A SudoAI deployment reachable from your computer
- `SUDOAI_API_KEY` when authenticated CLI access is enabled

## Install globally

From the repository:

```bash
cd cli
npm install -g .
```

After installation, the command is:

```bash
sudoai
```

Check installation:

```bash
sudoai --help
```

When the package is published to npm, the intended public installation will be:

```bash
npm install -g @sudobuild/sudoai-cli
```

## Start SudoAI

Open a terminal in your project:

```bash
cd my-project
sudoai
```

Or run a single request:

```bash
sudoai "explain this project"
sudoai "find the authentication bug"
sudoai "fix the failing test"
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

Set the API key when required:

```bash
export SUDOAI_API_KEY="your-cli-api-key"
```

Optionally select a model:

```bash
export SUDOAI_MODEL="llama-3.1-8b-instant"
```

Never commit API keys to Git.

## Commands

```text
sudoai                  Start interactive mode
sudoai "request"        Run a single request
sudoai --help            Show help
```

Inside interactive mode:

```text
/help                   Show help
/clear                  Clear the screen and start fresh
/exit                   Exit SudoAI
```

## Current tools

The agent can request:

- `read_file <path>` — read a workspace file
- `list <path>` — list a directory
- `write_file <path>` — replace/create a workspace file after confirmation
- `run <command>` — execute a shell command after confirmation

Commands and file paths execute locally on the user's computer. Paths outside the current workspace are blocked.

## Safety

The CLI asks for confirmation before every file write and shell command. The model cannot silently modify files or execute commands.

## Troubleshooting

### `SudoAI returned an empty response`

Check that your SudoAI deployment is running and `/api/chat` is reachable.

### `fetch failed`

Check your internet connection and `SUDOAI_API_URL`.

### Provider/API error

Check provider configuration in the SudoAI server and the selected model.
