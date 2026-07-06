/**
 * specReader.js — Front-matter reader and writer for SpecPact spec files.
 *
 * All spec files carry YAML front matter between `---` fences, followed by
 * Markdown content.  This module is the single point of contact for reading
 * and writing that front matter so that no other module contains raw string-
 * parsing logic for spec files.
 *
 * Canonical front-matter fields:
 *   id      : kebab-case spec identifier
 *   title   : human-readable spec title
 *   mode    : 'nano' | 'feature' | 'system'
 *   status  : 'draft' | 'in-progress' | 'stable' | 'deprecated'
 *   created : 'YYYY-MM-DD'
 *   updated : 'YYYY-MM-DD'
 *   author  : spec author marker or handle
 *   adr     : optional ADR reference for system specs
 *
 * Reading and writing use minimal, targeted front-matter parsing so field
 * order, comments, and the Markdown body are preserved exactly.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

// ─── Public types (JSDoc only — no TypeScript) ────────────────────────────────

/**
 * @typedef {Object} SpecFrontMatter
 * @property {string} id      - kebab-case spec identifier
 * @property {string} title   - human-readable spec title
 * @property {string} mode    - 'nano' | 'feature' | 'system'
 * @property {string} status  - 'draft' | 'in-progress' | 'stable' | 'deprecated'
 * @property {string} created - ISO date string 'YYYY-MM-DD'
 * @property {string} updated - ISO date string 'YYYY-MM-DD'
 * @property {string} author  - spec author marker or handle
 * @property {string} adr     - optional ADR reference for system specs
 */

/**
 * @typedef {Object} ParsedSpec
 * @property {SpecFrontMatter} data    - Parsed front-matter fields
 * @property {string}          content - Markdown body (everything after front matter)
 * @property {string}          raw     - Full raw file content
 */

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Read and parse a spec file.
 *
 * @param {string} filePath - Absolute path to spec.md
 * @returns {ParsedSpec}
 * @throws {Error} if the file does not exist
 */
export function readSpec(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Spec file not found: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf8');
  const parsed = parseFrontMatter(raw);
  const field = (key) => parsed.data[key] ?? '?';

  return {
    data: {
      id:      field('id'),
      title:   field('title'),
      mode:    field('mode'),
      status:  field('status'),
      created: field('created'),
      updated: field('updated'),
      author:  field('author'),
      adr:     field('adr'),
    },
    content: parsed.content,
    raw,
  };
}

function parseFrontMatter(raw) {
  const fencePattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = raw.match(fencePattern);

  if (!match) {
    return { data: {}, content: raw };
  }

  const yamlBlock = match[1];
  const data = {};

  for (const line of yamlBlock.split(/\r?\n/)) {
    const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (fieldMatch) {
      data[fieldMatch[1]] = fieldMatch[2].trim();
    }
  }

  return { data, content: match[2] };
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Update one or more front-matter fields in a spec file in-place.
 *
 * Uses targeted line replacement so that:
 *   - Field order in the front matter is preserved
 *   - The Markdown body is not touched
 *   - No reformatting or key-sorting is applied
 *
 * Only fields present in `updates` are modified.  Fields not in `updates`
 * are left exactly as they were in the source file.
 *
 * @param {string}              filePath - Absolute path to spec.md
 * @param {Partial<SpecFrontMatter>} updates  - Fields to update
 */
export function updateSpecFields(filePath, updates) {
  if (!existsSync(filePath)) {
    throw new Error(`Spec file not found: ${filePath}`);
  }

  let content = readFileSync(filePath, 'utf8');

  for (const [key, value] of Object.entries(updates)) {
    // Match the field anywhere inside the opening front-matter block.
    // The regex replaces `key: <anything>` with `key: <new-value>`.
    // We only replace the first occurrence (the front-matter one).
    content = replaceFirstFrontMatterField(content, key, String(value));
  }

  writeFileSync(filePath, content, 'utf8');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Replace the first occurrence of a front-matter field line.
 *
 * Front matter is the content between the first two `---` fences.  We locate
 * that region, do the replacement only inside it, then re-join with the body.
 *
 * @param {string} raw   - Full file content
 * @param {string} key   - Front-matter key (e.g. 'status')
 * @param {string} value - New value (e.g. 'stable')
 * @returns {string}     - Updated file content
 */
function replaceFirstFrontMatterField(raw, key, value) {
  // Split on the front-matter fences.
  // A valid front-matter block looks like:
  //   ---\n<yaml>\n---\n<body>
  const fencePattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = raw.match(fencePattern);

  if (!match) {
    // No front matter — nothing to replace
    return raw;
  }

  const yamlBlock = match[1];
  const body      = match[2];

  // Replace `key: <anything>` in the YAML block (first occurrence only)
  const fieldPattern = new RegExp(`^(${escapeRegex(key)}:\\s*).*$`, 'm');
  const updatedYaml  = yamlBlock.replace(fieldPattern, `$1${value}`);

  // Reconstruct preserving the original line ending style
  const lineEnding = raw.includes('\r\n') ? '\r\n' : '\n';
  return `---${lineEnding}${updatedYaml}${lineEnding}---${lineEnding}${body}`;
}

/**
 * Escape a string for use in a RegExp.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Validation helpers (shared across commands) ───────────────────────────────

/** Valid spec modes. */
export const VALID_MODES   = ['nano', 'feature', 'system'];

/** Valid spec statuses. */
export const VALID_STATUSES = ['draft', 'in-progress', 'stable', 'deprecated'];

/**
 * Spec-id validation regex.
 * Must be kebab-case: one or more lowercase-alphanumeric segments joined by hyphens.
 */
export const SPEC_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Return today's date as 'YYYY-MM-DD' (local time).
 * @returns {string}
 */
export function today() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}