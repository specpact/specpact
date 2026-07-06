#!/usr/bin/env node
/**
 * sync-templates.js — Pre-publish script for SpecPact CLI.
 *
 * Copies the workflow template directories from the repo root into cli/templates/
 * before every `npm publish`. This ensures the CLI always ships with the exact
 * templates that match its version.
 *
 * Source dirs (repo root):  .sdd/  .claude/  .github/agents/  .github/prompts/
 * Dest dir:                 cli/templates/
 *
 * Run manually: node cli/templates/sync-templates.js
 * Run via npm:  npm run sync-templates (from cli/)
 */

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// cli/templates/ is in the same directory as this script
const TEMPLATES_DIR = __dirname;

// Repo root is two levels up from cli/templates/
const REPO_ROOT = join(__dirname, '..', '..');

const SOURCE_DIRS = [
  { src: '.sdd', dest: '.sdd' },
  { src: '.claude', dest: '.claude' },
  { src: '.github/agents', dest: '.github/agents' },
  { src: '.github/prompts', dest: '.github/prompts' },
];

let totalCopied = 0;

for (const { src: srcName, dest: destName } of SOURCE_DIRS) {
  const src = join(REPO_ROOT, srcName);
  const dest = join(TEMPLATES_DIR, destName);

  if (!existsSync(src)) {
    console.warn(`  ⚠  Source directory not found, skipping: ${src}`);
    continue;
  }

  rmSync(dest, { recursive: true, force: true });
  const count = copyDir(src, dest);
  console.log(`  ✓  Synced ${destName}/ (${count} files)`);
  totalCopied += count;
}

console.log(`\n  Templates synced: ${totalCopied} files total\n`);

/**
 * Recursively copy all files from src to dest.
 * @param {string} src
 * @param {string} dest
 * @returns {number} number of files copied
 */
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  let count = 0;

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      count += copyDir(srcPath, destPath);
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
      count++;
    }
  }

  return count;
}