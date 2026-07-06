/**
 * init.js — specpact init command.
 *
 * Full flow:
 *   1. Guard: check if .sdd/ already exists (block unless --force)
 *   2. Guard: warn if not in a git repository
 *   3. Install .sdd/ into cwd
 *   4. Install .claude/ (unless --no-claude)
 *   5. Install .github/ (unless --no-copilot)
 *   6. Run Memory Bank wizard
 *   7. Stamp AGENTS.md with wizard answers
 *   8. Write .sdd/.specpact-version
 *   9. chmod +x .sdd/scripts/*.sh (macOS/Linux only)
 *  10. Print next-steps summary
 */

import { existsSync, chmodSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import inquirer from 'inquirer';

import { ok, err, warn, info, hint, spacer, header } from '../lib/printer.js';
import { installSdd, installClaude, installGitHub, writeVersionStamp } from '../lib/installer.js';
import { runWizard, stampAgents } from '../lib/wizard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read CLI version from package.json
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')
);

/**
 * Main handler for `specpact init`.
 *
 * @param {object} options - commander option flags
 * @param {boolean} options.claude   - true = install .claude/ (default true, --no-claude sets false)
 * @param {boolean} options.copilot  - true = install .github/ (default true, --no-copilot sets false)
 * @param {boolean} options.force    - overwrite existing .sdd/
 * @param {string}  options.projectName - project name for non-interactive setup
 * @param {string}  options.projectType - project type for non-interactive setup
 * @param {string}  options.language    - primary language/stack for non-interactive setup
 * @param {string}  options.purpose     - project purpose for non-interactive setup
 */
export async function initCommand(options) {
  const targetDir = resolve(process.cwd());
  const sddPath = join(targetDir, '.sdd');

  // ─── Guard 1: .sdd/ already exists ────────────────────────────────────────
  if (existsSync(sddPath)) {
    if (!options.force) {
      err('.sdd/ already exists in this directory.');
      hint('  If you want to reinstall SpecPact, run: specpact init --force');
      hint('  WARNING: --force will overwrite .sdd/scripts/ and .sdd/modes/ but leave .sdd/memory/ and .sdd/specs/ untouched.');
      process.exit(1);
    }

    // --force: confirm before proceeding
    warn('.sdd/ already exists. --force was passed.');
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'This will overwrite .sdd/scripts/ and .sdd/modes/. Your specs and memory bank will NOT be touched. Continue?',
        default: false,
      },
    ]);

    if (!confirmed) {
      info('Aborted.');
      process.exit(0);
    }
  }

  // ─── Guard 2: Not in a git repository ─────────────────────────────────────
  const isGitRepo = isInsideGitRepo(targetDir);
  if (!isGitRepo) {
    warn('This directory is not inside a git repository.');
    hint('  SpecPact works best with git. Run `git init` first if this is intentional.');
  }

  // ─── Step 3: Install .sdd/ ─────────────────────────────────────────────────
  spacer();
  info('Installing SpecPact into ' + targetDir);
  spacer();

  const sddResult = installSdd(targetDir, {
    force: options.force,
    preserveUserContent: options.force,
  });

  if (sddResult.copied.length === 0 && !options.force) {
    err('No files were installed. Template directory may be missing.');
    process.exit(1);
  }

  ok(`.sdd/ installed (${sddResult.copied.length} files)`);

  // ─── Step 4: Install .claude/ ──────────────────────────────────────────────
  if (options.claude !== false) {
    const claudeResult = installClaude(targetDir);
    if (claudeResult.copied.length > 0) {
      ok(`.claude/ installed (${claudeResult.copied.length} files)`);
    } else if (claudeResult.skipped.length > 0) {
      info(`.claude/ — ${claudeResult.skipped.length} existing file(s) preserved (merge)`);
    }
  } else {
    hint('  Skipping .claude/ (--no-claude)');
  }

  // ─── Step 5: Install .github/ ──────────────────────────────────────────────
  if (options.copilot !== false) {
    const githubResult = installGitHub(targetDir);
    if (githubResult.copied.length > 0) {
      ok(`.github/ installed (${githubResult.copied.length} files)`);
    } else if (githubResult.skipped.length > 0) {
      info(`.github/ — ${githubResult.skipped.length} existing file(s) preserved (merge)`);
    }
  } else {
    hint('  Skipping .github/ (--no-copilot)');
  }

  // ─── Step 6 & 7: Wizard + stamp AGENTS.md ─────────────────────────────────
  const wizardAnswers = await getWizardAnswers(options);
  stampAgents(targetDir, wizardAnswers);
  ok('Memory Bank configured (.sdd/memory/AGENTS.md)');

  // ─── Step 8: Version stamp ─────────────────────────────────────────────────
  writeVersionStamp(targetDir, pkg.version);

  // ─── Step 9: chmod +x on shell scripts (Unix only) ────────────────────────
  chmodScripts(join(targetDir, '.sdd', 'scripts'));

  // ─── Step 10: Next-steps summary ──────────────────────────────────────────
  printNextSteps(wizardAnswers.name);
}

async function getWizardAnswers(options) {
  const provided = {
    name: options.projectName,
    type: options.projectType,
    language: options.language,
    purpose: options.purpose,
  };
  const providedFields = Object.entries(provided).filter(([, value]) => value !== undefined);

  if (providedFields.length === 0) {
    return runWizard();
  }

  const missingFields = Object.entries(provided)
    .filter(([, value]) => value === undefined || String(value).trim().length === 0)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    err(`Non-interactive init requires all Memory Bank fields. Missing: ${missingFields.join(', ')}`);
    hint('Provide: --project-name, --project-type, --language, and --purpose.');
    process.exit(1);
  }

  return {
    name: provided.name.trim(),
    type: provided.type.trim(),
    language: provided.language.trim(),
    purpose: provided.purpose.trim(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if targetDir is inside a git repository.
 * @param {string} targetDir
 * @returns {boolean}
 */
function isInsideGitRepo(targetDir) {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: targetDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * chmod +x on all .sh files in a directory (no-op on Windows).
 * @param {string} scriptsDir
 */
function chmodScripts(scriptsDir) {
  if (process.platform === 'win32') return;
  if (!existsSync(scriptsDir)) return;

  try {
    for (const file of readdirSync(scriptsDir)) {
      if (file.endsWith('.sh')) {
        chmodSync(join(scriptsDir, file), 0o755);
      }
    }
    ok('Shell scripts made executable (.sdd/scripts/*.sh)');
  } catch (e) {
    warn(`Could not chmod scripts: ${e.message}`);
  }
}

/**
 * Print the post-install next-steps summary.
 * @param {string} projectName
 */
function printNextSteps(projectName) {
  spacer();
  header('SpecPact is ready ✓');
  spacer();
  console.log(`  Project: ${projectName}`);
  spacer();
  console.log('  Next steps:');
  console.log('');
  console.log('  1. Review your Memory Bank:');
  hint('       open .sdd/memory/AGENTS.md');
  console.log('');
  console.log('  2. Create your first spec:');
  hint('       specpact new nano  <spec-id>   # bug fix');
  hint('       specpact new feature <spec-id>  # new capability');
  hint('       specpact new system <spec-id>   # architecture change');
  console.log('');
  console.log('  3. Load it into your AI tool:');
  hint('       Claude Code: /spec-load <spec-id>');
  hint('       Copilot:     @workspace /spec-load <spec-id>');
  spacer();
}