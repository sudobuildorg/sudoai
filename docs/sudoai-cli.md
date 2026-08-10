# SudoAI CLI — User Documentation

SudoAI CLI is the terminal version of SudoAI. It works inside a local project and is the first step toward a full coding agent.

## 1. Requirements

- Node.js 18+
- Internet access
- A reachable SudoAI deployment
- A `SUDOAI_API_KEY` when your deployment requires authenticated CLI access

## 2. Run the MVP

Clone the repository:

```bash
git clone https://github.com/sudobuildorg/sudoai.git
cd sudoai/cli
npm start
```

Or run it directly:

```bash
node src/index.mjs
```

One-shot mode:

```bash
node src/index.mjs "find the authentication bug"
```

## 3. Configuration

Default API:

```text
https://sudoai.vercel.app
```

Custom deployment:

```bash
export SUDOAI_API_URL="https://your-domain.example"
```

CLI key:

```bash
export SUDOAI_API_KEY="YOUR_KEY"
```

Optional model:

```bash
export SUDOAI_MODEL="llama-3.1-8b-instant"
```

Never commit secrets to GitHub.

## 4. Start inside your project

Always start the CLI from the project you want the agent to inspect:

```bash
cd ~/projects/my-app
node /path/to/sudoai/cli/src/index.mjs
```

Then:

```text
> inspect the authentication code
> find the bug
> fix it
> run the tests
```

## 5. Local tools

The model can request these tools:

```text
TOOL:read_file <path>
TOOL:list <path>
TOOL:write_file <path>
<complete file content>
TOOL_END
TOOL:run <shell command>
```

The CLI performs the action on the user's computer, not on the SudoAI server.

### Read a file

The agent can inspect a source file before making a recommendation.

### List a directory

The agent can inspect project structure without uploading the entire project.

### Write a file

The agent can create or replace a file, but the CLI asks for confirmation first.

### Run a command

The agent can request commands such as `npm test`, but the CLI asks for confirmation first.

## 6. Safety

The MVP requires confirmation before every file write and shell command.

Example:

```text
⚠ SudoAI wants to write this file:

src/auth.ts

Allow? [y/N]
```

and:

```text
⚠ SudoAI wants to run this command:

npm test

Allow? [y/N]
```

Only `y` or `yes` approves the operation. Everything else denies it.

File paths outside the current workspace are blocked.

## 7. Useful prompts

```text
inspect this project structure
find the authentication bug
explain this error
review the latest git diff
fix the failing test
run the tests and summarize failures
refactor this component
```

## 8. Current MVP scope

Included:

- Interactive terminal chat
- One-shot requests
- Workspace-aware file reads
- Directory listing
- File creation/replacement with confirmation
- Shell commands with confirmation
- Provider/model routing through SudoAI `/api/chat`

Next steps:

- `sudo login` device authentication
- Published `npm install -g` package
- Git status/diff/commit tools
- MCP support
- Usage limits and server-side CLI authorization
- Autonomous mode
- VS Code extension

## 9. Troubleshooting

### `SudoAI returned an empty response`

Check that the SudoAI deployment is running and `/api/chat` is reachable.

### `fetch failed`

Check your internet connection and `SUDOAI_API_URL`.

### Authentication error

Set a valid `SUDOAI_API_KEY` when CLI authentication is enabled.

### Command denied

The CLI requires approval. Answer `y` when you trust the requested command.

### Path outside workspace

Start the CLI from the project root and use relative paths inside that directory.

## 10. Security

Do not run the agent in a directory containing secrets unless you understand which files it may inspect. Keep API keys out of source code and shell history where practical.

This MVP intentionally does not provide unrestricted autonomous mode.
