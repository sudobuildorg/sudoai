# SudoAI Code for VS Code

SudoAI Code is the VS Code coding-agent client for SudoAI. It adds an `@sudo` chat participant that can inspect a workspace, search code, edit files, and run commands with explicit user confirmation.

The implementation follows VS Code's Chat Participant model, where an extension owns the end-to-end chat interaction and can use VS Code APIs for workspace operations. See the official VS Code documentation for Chat Participants and Language Model Tools. 

## MVP features

- `@sudo` in VS Code Chat
- `/fix` — investigate and fix a coding problem
- `/review` — review workspace or selected code
- `/test` — run or diagnose tests
- Read workspace files
- List directories
- Search text across the workspace
- Write/replace files after confirmation
- Run shell commands after confirmation
- Include the active editor selection as context
- Stream progress and model/provider attribution
- Use the existing SudoAI `/api/chat` backend

## Setup for development

Requirements:

- VS Code 1.96+
- Node.js 18+
- npm

From the repository:

```bash
cd vscode
npm install
npm run compile
```

Then open the `vscode` folder in VS Code and press `F5` to launch an Extension Development Host.

In the Extension Development Host, open a project folder and open Chat. Use:

```text
@sudo inspect this project and explain its architecture
```

## Configure SudoAI

Open VS Code Settings and search for `SudoAI`.

Settings:

- `sudoai.apiUrl` — defaults to `https://sudoai.vercel.app`
- `sudoai.apiKey` — optional API key for authenticated SudoAI access
- `sudoai.model` — optional model ID; blank uses the server default
- `sudoai.maxToolSteps` — maximum local agent steps per request, default 10

For development you can also use `settings.json`:

```json
{
  "sudoai.apiUrl": "https://sudoai.vercel.app",
  "sudoai.apiKey": "YOUR_KEY",
  "sudoai.model": ""
}
```

Do not commit an API key to a repository.

## How the agent works

The VS Code extension sends the user's request to SudoAI. The model can request a local tool using a structured line such as:

```text
TOOL:read_file {"path":"src/auth.ts"}
```

The extension executes the tool locally and sends the result back to the model. The loop continues until the model has a final answer or the tool-step limit is reached.

Mutating actions always require a user confirmation:

```text
SudoAI wants to write src/auth.ts.
[Allow] [Cancel]
```

and shell commands require:

```text
SudoAI wants to run:

npm test

[Run] [Cancel]
```

This keeps the first release conservative while still providing an agent-style workflow.

## Current limitations

This is the first VS Code MVP. It does not yet include:

- `sudo login` device authentication
- Marketplace publishing
- Native provider/model picker inside the extension
- Patch/diff preview before applying edits
- Git commit/push tools
- MCP integration
- Autonomous mode
- Server-side CLI/extension usage enforcement

Those should be added incrementally after this MVP is tested in VS Code.

## Next recommended phase

The next upgrade should be a **real patch/diff workflow**: SudoAI proposes a file change, VS Code shows the diff, and the user can Accept, Reject, or Edit before anything is written. After that, add `sudo login` so customers do not need to manage API keys manually.
