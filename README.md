# SpecPact

> Spec-Driven Development that fits how you actually work.

SpecPact helps teams define software intent before coding and keeps specifications as living, trackable contracts throughout a feature's lifetime. It works with Claude Code, GitHub Copilot, and any AI tool that can read a text file.

---

## Installation

```sh
npx specpact init
```

That is the entire installation experience. One command. Under 30 seconds. Works on macOS, Linux, and Windows.

> **Requires:** Node.js 18+. No git required at install time.

For daily use, install globally:

```sh
npm install -g specpact
```

---

## Why SpecPact

AI coding assistants are powerful, but they forget everything between sessions. They implement what the prompt implies, not what the spec requires. They treat a bug fix and an architectural change with the same ceremony. SpecPact fixes this.

| Problem | SpecPact's answer |
|---|---|
| AI forgets project context between sessions | **Memory Bank** — three files loaded into every session |
| Specs die when the PR merges | Specs are **permanent** — deprecated when removed, never deleted |
| One verbose workflow for every change size | **Three tiered modes** — nano, feature, system |
| AI implements beyond the spec boundary | **Mode rules** — numbered, prioritised, enforced per session |
| Unclear whether implementation matches the spec | **Verify command** — structured audit prompt, human-judged verdict |
| No upgrade path for installed scripts | **`specpact upgrade`** — surgical update, never touches your specs |

---

## How it works

Every SpecPact project has a `.sdd/` directory at the repo root. It contains three things:

**Memory Bank** — files that load into every AI session, every time.
```
.sdd/memory/AGENTS.md        ← your stack, conventions, anti-patterns
.sdd/memory/architecture.md  ← service topology and boundaries
.sdd/memory/decisions.md     ← why key decisions were made
```

**Specs** — one folder per feature, maintained for the feature's lifetime.
```
.sdd/specs/freight-matching/
  spec.md    ← the contract (permanent, never deleted)
  notes.md   ← implementation context (deleted when spec reaches stable)
```

**Mode rules** — numbered, prioritised instructions for your AI tool.
```
.sdd/modes/nano.md     ← bug fixes and small tweaks
.sdd/modes/feature.md  ← new capabilities
.sdd/modes/system.md   ← architectural changes
```

The workflow for any change:

1. `specpact new nano fix-my-bug` — create a spec
2. Fill it in — you write the contracts
3. Load it into your AI tool — `/spec-load fix-my-bug` or paste the mode file
4. Implement — AI follows the spec, not the prompt
5. `specpact verify fix-my-bug` — generate the audit prompt
6. `specpact update fix-my-bug stable` — mark it done

---

## Your first spec in 5 minutes

**Step 1 — Install (30 seconds)**

```sh
cd your-project
npx specpact init
```

Answer four prompts: project name, type, language/stack, and one-sentence purpose. SpecPact stamps your Memory Bank and you're ready.

For scripted setup, provide those answers as flags:

```sh
specpact init \
  --project-name "My API" \
  --project-type api \
  --language "Node.js, PostgreSQL" \
  --purpose "Handles customer account workflows"
```

**Step 2 — Fill in your Memory Bank (2 minutes)**

Open `.sdd/memory/AGENTS.md` and fill in the remaining sections: your naming conventions, what the AI should never do, your backend and frontend stacks.

**Step 3 — Create your first spec (30 seconds)**

```sh
specpact new nano  fix-my-bug        # bug fix
specpact new feature my-feature      # new capability
specpact new system my-architecture  # architectural change
```

**Step 4 — Fill in the spec and start implementing**

Open `.sdd/specs/fix-my-bug/spec.md` and fill in each section. Then load it into your AI tool:

- **Claude Code:** `/spec-load fix-my-bug`
- **Any other tool:** paste `.sdd/modes/nano.md` followed by your `spec.md`

Your AI now has the contracts, constraints, and scope boundary before it writes a single line of code.

---

## Commands

```sh
specpact init                          # install SpecPact, run setup wizard
specpact init --project-name ...       # install with non-interactive setup flags
specpact new <mode> <spec-id>          # create a spec (nano | feature | system)
specpact list                          # show all specs with status
specpact verify <spec-id>              # generate verification audit prompt
specpact update <spec-id> [status]     # update status, manage notes.md lifecycle
specpact upgrade                       # update scripts/modes to latest version
specpact upgrade --dry-run             # preview upgrade without applying
```

Run `specpact --help` or `specpact <command> --help` for full usage.

---

## Claude Code slash commands

SpecPact ships four slash commands in `.claude/commands/`:

| Command | What it does |
|---|---|
| `/spec-new` | Guided interview to create a spec — no shell required |
| `/spec-load <id>` | Loads spec + Memory Bank, restates intent, waits for confirmation before coding |
| `/spec-verify <id>` | Audits codebase against spec contracts, outputs ✓/~/✗/? per contract |
| `/spec-update <id>` | Proposes spec.md edits when implementation diverged |

`/spec-load` includes a mandatory confirmation step. The AI reads the spec, restates what it understands, lists every contract it will implement, and **waits for your "correct, begin" before writing any code.**

---

## GitHub Copilot

SpecPact installs agent definitions and prompt files in `.github/agents/` and `.github/prompts/`. Copilot will:
- Look for a spec in `.sdd/specs/` before implementing
- Read AGENTS.md for conventions
- Route to the correct mode rules file based on the spec's `mode` field
- Output a contract check when implementation is complete

---

## Directory structure

```
.sdd/
├── memory/
│   ├── AGENTS.md          ← Always loaded. Stack, conventions, anti-patterns.
│   ├── architecture.md    ← Service topology, data flow, boundaries.
│   └── decisions.md       ← ADR log. Why X was chosen over Y.
├── specs/
│   ├── _example/          ← Complete feature spec example (read this first)
│   └── _example-nano/     ← Complete nano spec example
├── modes/
│   ├── nano.md            ← 7 prioritised rules for nano-mode work
│   ├── feature.md         ← 9 prioritised rules for feature-mode work
│   └── system.md          ← 10 prioritised rules for system-mode work
├── scripts/
│   ├── init.sh            ← One-time setup wizard (also available as CLI)
│   ├── new-spec.sh        ← Bootstrap a new spec from a template
│   ├── list-specs.sh      ← Registry view with ANSI colour output
│   ├── verify.sh          ← Generate a verification audit prompt
│   └── update-spec.sh     ← Update status and manage notes.md lifecycle
└── templates/
    ├── spec-nano.md
    ├── spec-feature.md
    ├── spec-system.md
    └── notes.md

.claude/commands/          ← Claude Code slash commands
.github/agents/            ← GitHub Copilot agent definitions
.github/prompts/           ← GitHub Copilot prompt files
```

---

## Spec status lifecycle

```
draft ──► in-progress ──► stable ──► deprecated
```

- **draft** — spec written, work not started
- **in-progress** — implementation underway
- **stable** — all contracts verified, notes.md deleted
- **deprecated** — feature removed; spec kept as permanent record

Specs are never deleted.

---

## Philosophy

1. **Specs are contracts, not documents.** Compact (one screen), verifiable, honest about exclusions.
2. **Specs outlive branches.** A spec lives in `main` for the feature's entire life.
3. **Ceremony matches change size.** A bug fix takes a 20-line nano spec. An architectural change gets a system spec with a migration path.
4. **Memory Bank loads always; specs load on demand.** Every session gets project context. Only the relevant spec loads per task.
5. **Verification is human-triggered.** SpecPact generates the audit prompt. You decide what the result means.
6. **No lock-in.** The CLI is optional. All workflow files are plain Markdown and shell scripts you own.
7. **Adoptable incrementally.** Add SpecPact to an existing repo in under five minutes.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT