# Contributing to SpecPact

SpecPact is intentionally minimal. Before submitting anything, ask:

> Does this make specs more **durable** and AI sessions more **purposeful**, or does it just add ceremony?

If the answer is "it adds ceremony", it will not be merged.

---

## Design principles

These principles are the foundation of every decision in SpecPact. Changes that violate them will not be accepted regardless of their technical quality.

**DG-01 — Specs outlive branches**
A spec is a permanent resident of the repository, not a build artefact. It is created at the start of a feature and remains in `main` for the feature's entire life — updated when the feature changes, deprecated when it is removed, never deleted. Any contribution that treats a spec as branch-scoped or disposable contradicts the purpose of the system.
*Measured by: spec files persist in the main branch after PR merge.*

**DG-02 — Ceremony matches change size**
A bug fix must not require the same workflow as an architectural change. SpecPact has three modes (nano, feature, system) precisely because different changes demand different levels of specification. A nano spec should take under two minutes to create. A feature spec should take under ten. If a contribution adds steps to small changes, it defeats the tiering.
*Measured by: nano spec creation < 2 minutes; feature spec creation < 10 minutes.*

**DG-03 — Specs fit on one screen**
A spec that requires scrolling is a spec that will not be read. Feature specs must stay under 60 lines; nano specs under 20. If the contracts cannot be expressed within those limits, the change is too large for a single spec. Contributions that expand templates, add required sections, or increase minimum spec size will not be accepted.
*Measured by: feature spec.md < 60 lines; nano spec.md < 20 lines.*

**DG-04 — Minimal runtime surface**
SpecPact's public CLI is a small Node.js package, and the installed `.sdd/` workflow files remain plain Markdown and portable shell scripts. Do not add background services, databases, compiled binaries, networked runtime dependencies, or heavyweight framework requirements. Dependencies must earn their place by making the CLI safer or more portable without making installed projects depend on them.
*Measured by: `npx specpact init` works on Node.js 18+, and installed `.sdd/` files remain usable as plain text plus Bash 3.2+ scripts.*

**DG-05 — AI-tool agnostic core**
The `.sdd/` directory must work independently of any specific AI tool. Claude Code slash commands and the GitHub Copilot instructions file are additive integrations — not required parts of the system. A developer using any AI tool (or no AI tool at all) can use the shell scripts and templates directly. Contributions that make the core system depend on a specific AI product will not be accepted.
*Measured by: the `.sdd/` folder works independently of any AI integration.*

**DG-06 — Cross-platform**
SpecPact must work on macOS (Bash 3.2, BSD sed), Linux (Bash 5.x, GNU sed), and Windows via Git Bash 2.x or WSL. All scripts use `sed -i.bak` for BSD/GNU compatibility, `${BASH_SOURCE[0]}` for path resolution, and POSIX-compatible tools throughout. Contributions that introduce GNU-specific flags, macOS-specific behaviour, or Windows incompatibilities will not be accepted without a confirmed fix for all three platforms.
*Measured by: scripts pass on macOS Bash 3.2, Ubuntu 22, and Windows Git Bash 2.x.*

**DG-07 — Adoptable incrementally**
A team should be able to add SpecPact to an existing repository in under five minutes. Installation is a file copy. Initialisation is four questions. First use is a single shell command. Contributions that add friction to initial setup — additional configuration files, required credentials, wizard steps — make SpecPact harder to adopt and will not be accepted.
*Measured by: a developer can install and create their first spec in under 5 minutes following README alone.*

---

## What we welcome

**Shell script improvements**
Bug fixes, cross-platform compatibility improvements (especially Windows Git Bash / WSL edge cases), and error message clarity. All scripts must pass `shellcheck` with zero warnings.

**Mode rule improvements**
Changes to `.sdd/modes/` that make the AI's behaviour more predictable and constrained. Rules must be numbered and prioritised. Conflict resolution must be explicit.

**New AI tool integrations**
Slash command files or equivalent for tools beyond Claude Code and Copilot — as optional additions in their own directory, not modifications to `.sdd/`. These must not change the core system.

**Template and example improvements**
Corrections to template guidance comments, improved example specs, and clearer section annotations. No new required sections.

**Documentation**
Clarity improvements to README and CONTRIBUTING. Fix errors, improve examples, add troubleshooting for real edge cases encountered.

---

## What we will not merge

- Heavy runtime dependencies, external services, or tooling that installed projects must adopt to use SpecPact
- Anything that increases the number of required files per spec
- Automated spec content generation without explicit human review and confirmation
- Changes that conflate the Memory Bank (always-loaded project context) with Specs (feature-scoped contracts) — they are different things
- Anything that makes the `.sdd/` core dependent on a specific AI product
- New required sections in spec templates
- Spec status transitions that are automated rather than human-triggered
- Any feature that is not yet implemented being added to README or templates

---

## How to contribute

1. Open an issue first, especially for non-trivial changes. Describe the problem you are solving.
2. Fork the repository and create a branch: `git checkout -b your-change-name`
3. Make your changes. Test on macOS and Linux (and Windows Git Bash if possible).
4. If you changed any shell script, verify it passes `shellcheck` with zero warnings.
5. Open a PR. The description should answer: what problem does this solve, and which design principle does it support?

---

## Commit Messages

Use clear and meaningful commit messages:

- `feat: add new feature` — for new features
- `fix: resolve issue with ...` — for bug fixes
- `docs: update README` — for documentation changes
- `refactor: restructure ...` — for code refactoring
- `test: add tests for ...` — for adding tests
- `chore: update dependencies` — for maintenance tasks

---

## Reporting issues

Open a GitHub issue. Include:

- Which script or file is involved
- What you expected to happen
- What actually happened
- Your OS and Bash version (`bash --version`)
- If it's a `sed` or path issue: whether you're on BSD sed (macOS) or GNU sed (Linux)

---

## Code of Conduct

Be respectful and constructive in all interactions. We are committed to providing a welcoming and inclusive experience for everyone.

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
