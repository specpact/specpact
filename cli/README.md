# SpecPact CLI

> Spec-Driven Development workflow tool — install, create, list, verify, and upgrade specs from the command line.

## Installation

```sh
# Run without installing (recommended for first use):
npx specpact init

# Or install globally:
npm install -g specpact
specpact init
```

**Requires:** Node.js 18+. Works on macOS, Linux, and Windows (cmd, PowerShell, Git Bash).

---

## Quick start

```sh
cd your-project
npx specpact init
```

`init` installs SpecPact into the current directory and runs a four-question setup wizard to configure your Memory Bank.

---

## Commands

### `specpact init`

Install SpecPact into the current directory.

```sh
specpact init
specpact init --no-claude    # skip Claude Code slash commands
specpact init --no-copilot  # skip GitHub Copilot agents
specpact init --force        # reinstall over existing .sdd/
```

For CI or scripted setup, pass all four Memory Bank answers and the wizard is skipped:

```sh
specpact init \
    --project-name "My API" \
    --project-type api \
    --language "Node.js, PostgreSQL" \
    --purpose "Handles customer account workflows"
```

All four setup flags are required together: `--project-name`, `--project-type`, `--language`, and `--purpose`.

**What it installs:**

| Directory | Contents |
|-----------|---------|
| `.sdd/` | Core workflow: scripts, modes, memory, templates, example specs |
| `.claude/commands/` | Claude Code slash commands (`/spec-load`, `/spec-new`, etc.) |
| `.github/agents/` + `.github/prompts/` | GitHub Copilot agent definitions |

### `specpact new <mode> <spec-id>`

Create a new spec from the appropriate template. Pure Node.js — no shell required.

```sh
specpact new nano   fix-null-carrier-id   # bug fix or small tweak
specpact new feature user-auth-flow       # new capability
specpact new system migrate-to-postgres   # architecture change
```

**Validation:**
- `mode` must be `nano`, `feature`, or `system`
- `spec-id` must be kebab-case: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Blocks if a spec with that ID already exists

**What it creates:**
- All modes: `.sdd/specs/<spec-id>/spec.md` — populated from the mode template, with today's date and spec-id stamped in
- `feature` + `system` modes also create `.sdd/specs/<spec-id>/notes.md` for ephemeral implementation context

### `specpact list`

List all specs with ANSI colour by status. Skips `_`-prefixed example directories.

```sh
specpact list
```

Output is a fixed-width table with columns: `SPEC ID`, `MODE`, `STATUS`, `CREATED`.

| Colour | Status |
|--------|--------|
| Yellow | `draft` |
| Blue   | `in-progress` |
| Green  | `stable` |
| Dim    | `deprecated` |

### `specpact verify <spec-id>`

Generate the structured verification prompt and write it to stdout. Paste into your AI tool, or pipe/redirect it.

```sh
specpact verify user-auth-flow           # print to terminal
specpact verify user-auth-flow | pbcopy  # copy to clipboard (macOS)
specpact verify user-auth-flow > prompt.md  # save to file
```

The prompt instructs the AI to audit every numbered contract with a `✓ / ~ / ✗ / ?` verdict, check AGENTS.md compliance, and output a structured Markdown report. AGENTS.md is automatically appended to the prompt when present.

Diagnostic error messages go to stderr so piping captures only the prompt.

### `specpact update <spec-id> [status]`

Update a spec's status. Pure Node.js front-matter surgery — cross-platform, no `sed`.

```sh
specpact update user-auth-flow              # print current status
specpact update user-auth-flow in-progress  # mark as in progress
specpact update user-auth-flow stable       # mark stable (prompts to delete notes.md)
specpact update user-auth-flow deprecated   # mark deprecated (permanent record kept)
```

Valid statuses: `draft` | `in-progress` | `stable` | `deprecated`

**Behaviours:**
- No status arg → prints current status and valid options
- Same status as current → warns, makes no change
- Backwards transition → warns but does not block
- Reaching `stable` with `notes.md` present → interactive prompt to delete it

### `specpact upgrade`

Compare installed `.sdd/scripts/` and `.sdd/modes/` against the version bundled in this CLI and apply surgical updates. Pure Node.js diff — no external `diff` binary, no shell exec.

```sh
specpact upgrade              # interactive: show diff, confirm, apply
specpact upgrade --dry-run    # show diff and exit without writing anything
specpact upgrade --yes        # skip confirmation (for CI pipelines)
```

**Scope — only these directories are ever written:**

| Directory | Upgraded |
|-----------|---------|
| `.sdd/scripts/` | ✓ |
| `.sdd/modes/` | ✓ |
| `.sdd/memory/` | ✗ never touched |
| `.sdd/specs/` | ✗ never touched |
| `.sdd/templates/` | ✗ never touched |

**Output per file:**
- `MODIFIED` (yellow) — file exists in both, content changed. Shows a coloured unified diff with `+`/`-`/context lines.
- `NEW` (green) — file exists in bundled version but not in your install. Will be added.
- `UNCHANGED` (dim) — file is identical. Skipped.
- `EXTRA` (reported only) — file in your install but not in the bundle. Never deleted.

**Version stamp:** `.sdd/.specpact-version` is written on `init` and updated on every successful `upgrade`. The upgrade report shows installed vs bundled version.

**Line-ending normalisation:** CRLF and LF are treated as equal during comparison so Windows-authored files don't show false changes on macOS/Linux.

---

## Directory structure after `init`

```
.sdd/
├── memory/
│   ├── AGENTS.md          ← Always loaded. Stack, conventions, anti-patterns.
│   ├── architecture.md    ← Service topology, data flow, boundaries.
│   └── decisions.md       ← ADR log.
├── specs/
│   ├── _example/          ← Feature spec example (read first)
│   └── _example-nano/     ← Nano spec example
├── modes/
│   ├── nano.md
│   ├── feature.md
│   └── system.md
├── scripts/
│   ├── new-spec.sh
│   ├── list-specs.sh
│   ├── verify.sh
│   └── update-spec.sh
└── templates/
    ├── spec-nano.md
    ├── spec-feature.md
    ├── spec-system.md
    └── notes.md

.claude/commands/
├── spec-load.md
├── spec-new.md
├── spec-verify.md
└── spec-update.md

.github/
├── agents/
│   ├── spec-load.agent.md
│   ├── spec-new.agent.md
│   ├── spec-verify.agent.md
│   └── spec-update.agent.md
└── prompts/
    ├── spec-load.prompt.md
    ├── spec-new.prompt.md
    ├── spec-verify.prompt.md
    └── spec-update.prompt.md
```

---

## License

MIT

---

## Publishing (maintainers)

Templates are bundled inside the npm package. The `prepublishOnly` script syncs them automatically before every publish — you never need to run it manually.

```sh
cd cli

# 1. Bump the version
npm version patch   # or minor / major

# 2. Publish (prepublishOnly syncs templates automatically)
npm publish --access public
```

The `prepublishOnly` hook runs `node templates/sync-templates.js`, which copies `.sdd/`, `.claude/`, and `.github/` from the repo root into `cli/templates/`. This ensures the published package always ships the exact templates that match its version.

**Before first publish**, make sure you are logged in to npm:

```sh
npm login
npm whoami   # should print your npm username
```