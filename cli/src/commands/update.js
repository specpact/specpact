/**
 * update.js — specpact update <spec-id> [status]
 *
 * Updates a spec's status field and sets `updated` to today's date.
 * Full Node.js reimplementation of .sdd/scripts/update-spec.sh — no shell exec,
 * no sed, works identically on macOS, Linux, and Windows.
 *
 * Behaviour:
 *   - No status arg  → print current status and valid options, exit 0
 *   - Invalid status → exit 1 with error message
 *   - Valid status   → update spec.md front matter in-place
 *   - Reaching stable with notes.md present → interactive prompt to delete it
 *
 * The `updated` field is updated to today's date on every successful status
 * change (matching the shell script behaviour exactly).
 */

import { existsSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import inquirer from 'inquirer';

import { ok, err, warn, info, hint, spacer } from '../lib/printer.js';
import {
  readSpec,
  updateSpecFields,
  VALID_STATUSES,
  today,
} from '../lib/specReader.js';

/**
 * Handler for `specpact update <spec-id> [status]`.
 *
 * @param {string}           specId    - kebab-case spec identifier
 * @param {string|undefined} newStatus - optional new status value
 */
export async function updateCommand(specId, newStatus) {
  const projectRoot = resolve(process.cwd());
  const specsDir    = join(projectRoot, '.sdd', 'specs');
  const specFile    = join(specsDir, specId, 'spec.md');
  const notesFile   = join(specsDir, specId, 'notes.md');

  // ─── Guard: spec must exist ───────────────────────────────────────────────
  if (!existsSync(specFile)) {
    err(`No spec found at .sdd/specs/${specId}/spec.md`);
    hint("Run 'specpact list' to see available specs.");
    process.exit(1);
  }

  // ─── Read current spec ────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = readSpec(specFile);
  } catch (e) {
    err(`Failed to read spec: ${e.message}`);
    process.exit(1);
  }

  const currentStatus = parsed.data.status;

  // ─── No-status-arg: report and exit ─────────────────────────────────────
  if (!newStatus) {
    spacer();
    info(`Current status: ${currentStatus}`);
    hint(`Valid statuses: ${VALID_STATUSES.join(', ')}`);
    spacer();
    return;
  }

  // ─── Validate new status ──────────────────────────────────────────────────
  if (!VALID_STATUSES.includes(newStatus)) {
    err(`Invalid status: ${newStatus}`);
    hint(`Valid statuses: ${VALID_STATUSES.join(', ')}`);
    process.exit(1);
  }

  // ─── Warn on no-op transition ─────────────────────────────────────────────
  if (newStatus === currentStatus) {
    warn(`Spec '${specId}' is already '${currentStatus}'. No change made.`);
    return;
  }

  // ─── Warn on backwards transition ────────────────────────────────────────
  // (informational only — not blocked, because legitimate cases exist)
  const order = { draft: 0, 'in-progress': 1, stable: 2, deprecated: 3 };
  if (order[newStatus] < order[currentStatus]) {
    warn(`Moving status backwards: ${currentStatus} → ${newStatus}`);
  }

  // ─── Update front matter in-place ────────────────────────────────────────
  try {
    updateSpecFields(specFile, {
      status:  newStatus,
      updated: today(),
    });
  } catch (e) {
    err(`Failed to update spec: ${e.message}`);
    process.exit(1);
  }

  ok(`Updated .sdd/specs/${specId}/spec.md — status: ${newStatus}`);

  // ─── notes.md lifecycle: prompt to delete when reaching stable ────────────
  if (newStatus === 'stable' && existsSync(notesFile)) {
    spacer();
    warn(`notes.md exists at .sdd/specs/${specId}/notes.md`);
    info('Specs reaching stable no longer need notes.md (it contains ephemeral context).');

    const { shouldDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldDelete',
        message: 'Delete notes.md now?',
        default: true,
      },
    ]);

    if (shouldDelete) {
      try {
        rmSync(notesFile);
        ok(`Deleted .sdd/specs/${specId}/notes.md`);
      } catch (e) {
        err(`Could not delete notes.md: ${e.message}`);
      }
    } else {
      hint('notes.md kept. Delete it manually when you are ready.');
    }
  }

  // ─── Post-update hints ────────────────────────────────────────────────────
  spacer();
  if (newStatus === 'deprecated') {
    hint('Deprecated specs are never deleted — they remain as permanent records.');
  } else if (newStatus === 'stable') {
    hint(`Spec is stable. Run 'specpact verify ${specId}' anytime to re-audit.`);
  } else if (newStatus === 'in-progress') {
    hint(`Spec is in progress. Load it into your AI tool when you are ready to implement.`);
    hint(`  Claude Code:  /spec-load ${specId}`);
  }
}