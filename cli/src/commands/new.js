/**
 * new.js — specpact new <mode> <spec-id>
 *
 * Creates a new spec file from the installed template.  Full Node.js
 * reimplementation of .sdd/scripts/new-spec.sh — no shell exec.
 *
 * Flow:
 *   1. Validate mode  (nano | feature | system)
 *   2. Validate spec-id  (kebab-case regex)
 *   3. Guard: ensure .sdd/ exists (i.e. specpact init has been run)
 *   4. Guard: block if spec already exists
 *   5. Guard: ensure template file exists
 *   6. Stamp template → spec.md  (replace spec/date/title placeholders)
 *   7. Create notes.md for feature / system modes
 *   8. Print confirmation and next-step hint
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

import { ok, err, hint, spacer } from '../lib/printer.js';
import { VALID_MODES, SPEC_ID_PATTERN, today } from '../lib/specReader.js';

/**
 * Handler for `specpact new <mode> <spec-id>`.
 *
 * @param {string} mode   - 'nano' | 'feature' | 'system'
 * @param {string} specId - kebab-case spec identifier
 */
export function newCommand(mode, specId) {
  const projectRoot = resolve(process.cwd());
  const sddDir = join(projectRoot, '.sdd');
  const specsDir = join(sddDir, 'specs');
  const templatesDir = join(sddDir, 'templates');

  // ─── 1. Validate mode ────────────────────────────────────────────────────
  if (!VALID_MODES.includes(mode)) {
    err(`Unknown mode: ${mode}`);
    hint(`Valid modes are: ${VALID_MODES.join(', ')}`);
    process.exit(1);
  }

  // ─── 2. Validate spec-id ─────────────────────────────────────────────────
  if (!SPEC_ID_PATTERN.test(specId)) {
    err(`Invalid spec-id: '${specId}'`);
    hint('spec-id must be kebab-case: lowercase letters, numbers, and hyphens only.');
    hint('Example: fix-null-carrier-id');
    process.exit(1);
  }

  // ─── 3. Guard: .sdd/ must exist ──────────────────────────────────────────
  if (!existsSync(sddDir)) {
    err('.sdd/ not found in this directory.');
    hint('Run `specpact init` first to install SpecPact into this project.');
    process.exit(1);
  }

  // ─── 4. Guard: duplicate spec-id ─────────────────────────────────────────
  const specDir = join(specsDir, specId);
  if (existsSync(specDir)) {
    err(`Spec already exists: .sdd/specs/${specId}/`);
    process.exit(1);
  }

  // ─── 5. Guard: template must exist ───────────────────────────────────────
  const templateFile = join(templatesDir, `spec-${mode}.md`);
  if (!existsSync(templateFile)) {
    err(`Template not found: .sdd/templates/spec-${mode}.md`);
    hint('Run `specpact init` to restore missing templates.');
    process.exit(1);
  }

  // ─── 6. Stamp spec.md from template ──────────────────────────────────────
  mkdirSync(specDir, { recursive: true });

  const date = today();
  const specTitle = titleFromSpecId(specId);
  const rawTemplate = readFileSync(templateFile, 'utf8');
  const stampedSpec = rawTemplate
    .replace(/YYYY-MM-DD/g, date)
    .replace(/\[SPEC_DATE\]/g, date)
    .replace(/<spec-id>/g, specId)
    .replace(/\[SPEC_ID\]/g, specId)
    .replace(/<spec-title>/g, specTitle)
    .replace(/\[SPEC_TITLE\]/g, specTitle);

  const specFile = join(specDir, 'spec.md');
  writeFileSync(specFile, stampedSpec, 'utf8');

  // ─── 7. Create notes.md for feature / system modes ───────────────────────
  if (mode === 'feature' || mode === 'system') {
    const notesTemplateFile = join(templatesDir, 'notes.md');
    const notesFile = join(specDir, 'notes.md');

    if (existsSync(notesTemplateFile)) {
      const rawNotes = readFileSync(notesTemplateFile, 'utf8');
      const stampedNotes = rawNotes
        .replace(/<spec-id>/g, specId)
        .replace(/\[SPEC_ID\]/g, specId);
      writeFileSync(notesFile, stampedNotes, 'utf8');
    } else {
      // Graceful fallback: create a minimal empty notes.md
      writeFileSync(notesFile, `# Notes: ${specId}\n`, 'utf8');
    }
  }

  // ─── 8. Confirmation ─────────────────────────────────────────────────────
  spacer();
  ok(`Spec created: .sdd/specs/${specId}/spec.md`);

  if (mode === 'feature' || mode === 'system') {
    ok(`Notes created: .sdd/specs/${specId}/notes.md`);
  }

  spacer();
  hint(`Next: fill in the spec, then load it into your AI tool.`);
  hint(`  Claude Code:  /spec-load ${specId}`);
  hint(`  Copilot:      use the spec-load prompt with spec-id: ${specId}`);
}

/**
 * Convert a kebab-case spec ID into the same human-readable title used by
 * .sdd/scripts/new-spec.sh.
 *
 * @param {string} specId
 * @returns {string}
 */
function titleFromSpecId(specId) {
  const rawTitle = specId.replace(/-/g, ' ');
  return rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
}