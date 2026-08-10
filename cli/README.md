# SudoAI CLI

SudoAI CLI is the first terminal client for SudoAI. It lets you work with SudoAI from a project directory and gives the agent controlled access to inspect files, edit files, list folders, and run terminal commands with confirmation.

> **MVP note:** this is the first CLI release. Authenticated CLI login, Git tools, MCP, and autonomous mode are planned next.

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
node cli/src/index.mjs "fix the failing test"
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
- `write_file <path>` — replace/create a workspace file after confirmation
- `run <command>` — execute a shell command after confirmation

Commands and file paths are executed locally on the user's computer. The CLI blocks paths outside the current workspace.

## Safety

The CLI asks for confirmation before every file write and shell command. This is intentional. The model cannot silently modify a file or execute a command.

For example:

```text
⚠ SudoAI wants to write this file:

src/app.ts

Allow? [y/N]
```

or:

```text
⚠ SudoAI wants to run this command:

npm test

Allow? [y/N]
```

## Commands

```text
sudo                 Start interactive mode
sudo "request"       Run a single request
sudo --help          Show help
exit                 Leave interactive mode
```

## Example workflow

```bash
cd my-project
node /path/to/sudoai/cli/src/index.mjs
```

Then:

```text
> inspect the project and find the login bug
> fix it
> run the tests
```

The agent can inspect files, propose a change, ask for permission to write it, and then ask before running tests.

## Troubleshooting

### `SudoAI returned an empty response`

Check that your SudoAI deployment is running and that `/api/chat` is reachable.

### Provider/API error

Check the provider configuration in the SudoAI server and your selected model.

### `fetch failed`

Check your internet connection and `SUDOAI_API_URL`.
