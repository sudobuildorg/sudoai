# SudoAI Code — VS Code User Guide

SudoAI Code brings the SudoAI coding agent into VS Code. It is used from the VS Code Chat view with `@sudo`.

## Install the development build

Until the Marketplace package is published, use the repository:

```bash
git clone https://github.com/sudobuildorg/sudoai.git
cd sudoai/vscode
npm install
npm run compile
```

Open `sudoai/vscode` in VS Code and press `F5`. A new **Extension Development Host** window opens.

Open your coding project in that window.

## Start SudoAI

Open VS Code Chat and type:

```text
@sudo inspect this project
```

Examples:

```text
@sudo find the authentication bug
@sudo explain this project structure
@sudo review the current code
@sudo run the tests and fix failures
```

Slash commands:

```text
@sudo /fix fix the login error
@sudo /review review the current changes
@sudo /test run the project tests
```

## What SudoAI can do

SudoAI can use local workspace tools to:

- read files
- list directories
- search code
- write files
- run shell commands

File changes and shell commands require explicit approval in the first release.

## Configure your SudoAI account

Open **Settings → Extensions → SudoAI**.

Set:

- **API URL**: `https://sudoai.vercel.app`
- **API Key**: your SudoAI API key, if required
- **Model**: optional model ID
- **Max Tool Steps**: maximum number of agent actions in one request

Do not share or commit your API key.

## Understanding the workflow

For a request such as:

```text
@sudo fix the authentication bug
```

SudoAI may inspect the workspace first, then request a local action:

```text
read_file → edit → run tests → inspect result → final answer
```

The extension performs the local actions. Your source code and terminal are not executed on the SudoAI server.

## Safety

The first version asks before:

- writing a file
- running a shell command

The workspace path is restricted to the currently opened workspace folder.

Do not approve commands you do not understand.

## Troubleshooting

### `SudoAI returned an empty response`

Check that `sudoai.apiUrl` points to a working SudoAI deployment and that `/api/chat` is available.

### Authentication error

Set a valid `sudoai.apiKey` if your SudoAI deployment requires authenticated access.

### SudoAI cannot see my project

Make sure the project folder is opened as the VS Code workspace in the Extension Development Host.

### The agent stops after several actions

Increase `sudoai.maxToolSteps`, but keep the limit reasonable. The default is 10.

## Roadmap

Next planned improvements are:

1. `sudo login` device authentication
2. visual file diff before applying edits
3. Git tools
4. MCP support
5. native model selection
6. Marketplace release
7. autonomous mode with configurable permissions
