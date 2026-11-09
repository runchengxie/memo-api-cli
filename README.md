# memo-api

English | [简体中文](README.zh-CN.md)

A command-line client for the Maimemo Open API. Manage vocabulary mnemonics, interpretations, phrases, notepads, and study records from your terminal.

## Installation

```bash
npm install -g @maimemo/memo-api
```

Requires Node.js 20.19+ (20.x), 22.12+ (22.x), or 23+, matching the yargs runtime requirements.

## Setup

The tool accepts credentials from four sources, in order of priority:

1. **Command-line flag**: `-T` or `--token`
2. **Environment variable**: `MAIMEMO_API_TOKEN`
3. **Configuration file**: `~/.config/memo-api.json`, containing `{ "apiToken": "YOUR_TOKEN" }`
4. **OIDC login**: run `memo-api auth login` to obtain and save credentials automatically

Set `MEMO_API_CONFIG_PATH` to use a different configuration file.

### OIDC login

```bash
# Sign in (opens a browser for authorization)
memo-api auth login

# Show the signed-in user
memo-api auth whoami
```

## Usage

```
memo-api <resource> <action> [arguments...]
```

### Resources and actions

| Resource | Actions | Description |
|----------|---------|-------------|
| `auth` | `login`, `whoami` | Authentication and user identity |
| `voc` / `vocabulary` | `get`, `query` | Vocabulary lookup |
| `note` | `list`, `create`, `update`, `delete` | Mnemonics |
| `interp` / `interpretation` | `list`, `create`, `update`, `delete` | Interpretations |
| `phrase` | `list`, `create`, `update`, `delete` | Phrases |
| `notepad` | `list`, `get`, `create`, `update`, `delete` | Notepads |
| `study` | `progress`, `today`, `records`, `add`, `advance` | Study records |

### Common options

| Option | Description |
|--------|-------------|
| `-T, --token` | API Token |
| `-O, --output` | Output format: `json` or `column` (default: `column`) |
| `--no-color` | Disable colored output |
| `--verbose` | Show request details |
| `-H, --no-header` | Omit the header row |
| `--fields` | Select fields (comma-separated; `+` adds fields, `-` removes fields) |

### Examples

```bash
# Sign in
memo-api auth login

# Look up a word
memo-api voc get --spelling=apple

# List mnemonics
memo-api note list --word=apple

# Create a mnemonic (Chinese note type and content)
memo-api note create --word=apple --type=谐音 --note="苹果的助记"

# Request JSON output
memo-api voc get --spelling=apple -O json

# Show study progress
memo-api study progress

# Add words to a study plan
memo-api study add -w hello -w world

# Query records for stubborn words (STICKING)
memo-api study records -t STICKING

# Pipe JSON input
echo '{"spelling":"apple"}' | memo-api voc get
```

### Advanced usage

**JSON input through stdin**: supply a JSON request body or parameters through stdin. Valid JSON input skips command-line argument validation.

```bash
# Use stdin JSON as the request body
echo '{"note":{"voc_id":"v123","note_type":"谐音","note":"内容"}}' | memo-api note create

# Supply parameters through stdin JSON
echo '{"id":"note_id"}' | memo-api note delete -f
```

**Field selection**: `--fields` supports three modes.

```bash
# Replace: show only the selected fields
memo-api note list --word=apple --fields=id,note

# Add: include extra fields alongside the defaults
memo-api note list --word=apple --fields=+updated_time

# Remove: exclude selected fields from the full field set
memo-api note list --word=apple --fields=-status
```

**Array arguments**: repeat flags or provide newline-separated values through stdin.

```bash
# Repeat the flag
memo-api study add --id v1 --id v2 --id v3

# Read newline-separated values from stdin (- means stdin)
echo -e "v1\nv2\nv3" | memo-api study add --id -
```

**Debugging**: use `--verbose` to inspect the full HTTP request and response.

```bash
memo-api voc get --spelling=apple --verbose
```

**Skip confirmation**: delete operations ask for confirmation by default. Use `-f` to skip it.

```bash
memo-api note delete id123 -f
```

**Shell completion**: load the completion script when your shell starts to enable Tab completion for commands, subcommands, and options.

```bash
# bash
memo-api completion >> ~/.bashrc

# zsh
memo-api completion >> ~/.zshrc
```

## Changelog

### 1.2.0

- Added login commands

### 1.1.0

- Added shell completion
