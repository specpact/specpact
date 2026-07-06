#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { program } from 'commander';

import { initCommand }    from '../src/commands/init.js';
import { newCommand }     from '../src/commands/new.js';
import { listCommand }    from '../src/commands/list.js';
import { verifyCommand }  from '../src/commands/verify.js';
import { updateCommand }  from '../src/commands/update.js';
import { upgradeCommand } from '../src/commands/upgrade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

program
  .name('specpact')
  .description('Spec-Driven Development workflow tool')
  .version(pkg.version, '-v, --version', 'output the current version')
  .addHelpText('after', `
Examples:
  $ specpact init                        install SpecPact into the current project
  $ specpact new nano  fix-null-pointer  create a bug-fix spec
  $ specpact new feature user-auth       create a feature spec
  $ specpact list                        show all specs with status
  $ specpact verify user-auth            generate a verification prompt
  $ specpact update user-auth stable     mark a spec stable
  $ specpact upgrade                     update scripts/modes to the latest version

Docs: https://github.com/specpact/specpact`);

// ── specpact init ────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Install SpecPact into the current directory and run the Memory Bank setup wizard')
  .option('--no-claude',  'skip .claude/commands/ installation')
  .option('--no-copilot', 'skip .github/agents/ and .github/prompts/ installation')
  .option('--force',      'overwrite existing .sdd/ (dangerous — prompts for confirmation)')
  .option('--project-name <name>', 'project name for non-interactive Memory Bank setup')
  .option('--project-type <type>', 'project type for non-interactive Memory Bank setup')
  .option('--language <stack>',    'primary language/stack for non-interactive Memory Bank setup')
  .option('--purpose <sentence>',  'one-sentence project purpose for non-interactive Memory Bank setup')
  .addHelpText('after', `
Examples:
  $ specpact init                 standard install — installs .sdd/, .claude/, .github/
  $ specpact init --no-claude     skip Claude Code slash commands
  $ specpact init --no-copilot    skip GitHub Copilot agents
  $ specpact init --force         reinstall over an existing .sdd/ (prompts first)
  $ specpact init --project-name API --project-type api --language Node.js --purpose "Test API"`)
  .action(initCommand);

// ── specpact new <mode> <spec-id> ───────────────────────────────────────────
program
  .command('new <mode> <spec-id>')
  .description('Create a new spec from the appropriate template (nano | feature | system)')
  .addHelpText('after', `
Arguments:
  mode     nano | feature | system
  spec-id  kebab-case identifier, e.g. fix-null-carrier-id

Examples:
  $ specpact new nano    fix-null-carrier-id   bug fix or small tweak
  $ specpact new feature freight-matching      new capability
  $ specpact new system  migrate-to-postgres   architectural change`)
  .action(newCommand);

// ── specpact list ────────────────────────────────────────────────────────────
program
  .command('list')
  .description('List all specs with status, mode, and created date')
  .addHelpText('after', `
Output is colour-coded by status:
  yellow  draft
  blue    in-progress
  green   stable
  dim     deprecated

Example:
  $ specpact list`)
  .action(listCommand);

// ── specpact verify <spec-id> ────────────────────────────────────────────────
program
  .command('verify <spec-id>')
  .description('Output the structured verification prompt for a spec to stdout')
  .addHelpText('after', `
The prompt instructs the AI to audit every contract with a ✓/~/✗/? verdict.
Diagnostic messages go to stderr so the prompt can be safely piped.

Examples:
  $ specpact verify freight-matching            print to terminal
  $ specpact verify freight-matching | pbcopy   copy to clipboard (macOS)
  $ specpact verify freight-matching > p.md     save to file`)
  .action(verifyCommand);

// ── specpact update <spec-id> [status] ───────────────────────────────────────
program
  .command('update <spec-id> [status]')
  .description('Update a spec\'s status (draft | in-progress | stable | deprecated)')
  .addHelpText('after', `
Valid statuses: draft | in-progress | stable | deprecated

  Omitting [status] prints the current status without making changes.
  Reaching 'stable' with notes.md present prompts to delete it.

Examples:
  $ specpact update freight-matching              show current status
  $ specpact update freight-matching in-progress  mark as in-progress
  $ specpact update freight-matching stable       mark stable (prompts for notes.md)
  $ specpact update freight-matching deprecated   archive the spec`)
  .action(updateCommand);

// ── specpact upgrade ─────────────────────────────────────────────────────────
program
  .command('upgrade')
  .description('Update .sdd/scripts/ and .sdd/modes/ from the bundled version')
  .option('--dry-run', 'show what would change without applying')
  .option('--yes',     'skip confirmation prompt (for CI)')
  .addHelpText('after', `
Only .sdd/scripts/ and .sdd/modes/ are ever written.
.sdd/memory/ and .sdd/specs/ are never touched.

Examples:
  $ specpact upgrade            show diff, confirm, apply
  $ specpact upgrade --dry-run  show diff only — nothing is written
  $ specpact upgrade --yes      apply without prompting (CI-safe)`)
  .action(upgradeCommand);

program.parse(process.argv);
