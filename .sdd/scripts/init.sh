#!/usr/bin/env bash
# =============================================================================
# SpecPact — init.sh
# One-time project setup. Run once from your project root after copying .sdd/.
#
# Usage: .sdd/scripts/init.sh
# =============================================================================
set -euo pipefail

# ── Resolve paths ─────────────────────────────────────────────────────────────
# SCRIPT_DIR is the directory containing this script (.sdd/scripts/).
# SDD_DIR is the .sdd/ root. PROJECT_ROOT is one level above that.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDD_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${SDD_DIR}/.." && pwd)"

# ── Helpers ───────────────────────────────────────────────────────────────────
print_header() {
  printf '\n  SpecPact init\n'
  printf '  %s\n\n' "────────────────────────────────────────"
}

print_ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
print_err()  { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; }
print_warn() { printf '  \033[33m⚠\033[0m %s\n' "$1"; }
print_info() { printf '  %s\n' "$1"; }

copy_bridge_dir() {
  local src_dir="$1"
  local dst_dir="$2"
  local label="$3"
  local copied=0
  local skipped=0
  local file
  local dest_file

  [[ -d "${src_dir}" ]] || return 0

  mkdir -p "${dst_dir}"

  for file in "${src_dir}"/*; do
    [[ -f "${file}" ]] || continue
    dest_file="${dst_dir}/$(basename "${file}")"
    if [[ -f "${dest_file}" ]]; then
      skipped=$((skipped + 1))
    else
      cp "${file}" "${dest_file}"
      copied=$((copied + 1))
    fi
  done

  if [[ "${copied}" -gt 0 ]]; then
    print_ok "${label} installed (${copied} file(s))"
  elif [[ "${skipped}" -gt 0 ]]; then
    print_ok "${label} already in place (${skipped} file(s) preserved)"
  fi
}

# Portable in-place sed replacement.
# Usage: sed_inplace 's/find/replace/g' file
# Uses -i .bak on macOS (BSD sed) and -i on Linux (GNU sed) — the .bak trick
# works on both because we immediately remove the backup.
sed_inplace() {
  local expression="$1"
  local file="$2"
  sed -i.bak "$expression" "$file"
  rm -f "${file}.bak"
}

# ── Preflight checks ──────────────────────────────────────────────────────────
# Must be run from the project root (where .sdd/ lives) or from anywhere as
# long as .sdd/ is resolvable. We verify the memory file is present.
if [[ ! -f "${SDD_DIR}/memory/AGENTS.md" ]]; then
  print_err "Cannot find .sdd/memory/AGENTS.md"
  print_err "Make sure you are running init.sh from within the .sdd/scripts/ folder"
  print_err "and that the full .sdd/ directory was copied correctly."
  exit 1
fi

# Warn if already initialised (PROJECT_NAME no longer contains the placeholder).
if ! grep -q '\[PROJECT_NAME\]' "${SDD_DIR}/memory/AGENTS.md"; then
  print_warn "AGENTS.md appears to have already been initialised."
  printf '  Continue anyway? This will overwrite your existing entries. (y/n): '
  read -r CONFIRM
  if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
    print_info "Aborted. No changes made."
    exit 0
  fi
fi

# ── Gather project details ────────────────────────────────────────────────────
print_header

print_info "Answer a few questions to set up your project's Memory Bank."
print_info "You can edit .sdd/memory/AGENTS.md at any time to refine these."
printf '\n'

# Project name
printf '  Project name: '
read -r PROJECT_NAME
if [[ -z "${PROJECT_NAME}" ]]; then
  print_err "Project name cannot be empty."
  exit 1
fi

# Project type
printf '  Project type (e.g. web app, REST API, CLI tool, mobile app): '
read -r PROJECT_TYPE
if [[ -z "${PROJECT_TYPE}" ]]; then
  PROJECT_TYPE="[PROJECT_TYPE]"
fi

# Primary languages
printf '  Primary language(s) (e.g. Java 21, Python 3.12, TypeScript 5): '
read -r PRIMARY_LANGUAGES
if [[ -z "${PRIMARY_LANGUAGES}" ]]; then
  PRIMARY_LANGUAGES="[PRIMARY_LANGUAGES]"
fi

# One-line purpose
printf '  One-line purpose (from the user'\''s perspective): '
read -r PROJECT_PURPOSE
if [[ -z "${PROJECT_PURPOSE}" ]]; then
  PROJECT_PURPOSE="[PROJECT_PURPOSE]"
fi

# ── Stamp AGENTS.md ───────────────────────────────────────────────────────────
# We stamp only the four fields we collected. All other placeholders stay
# for the developer to fill in manually — they require more thought.
AGENTS_FILE="${SDD_DIR}/memory/AGENTS.md"

sed_inplace "s|\[PROJECT_NAME\]|${PROJECT_NAME}|g"           "${AGENTS_FILE}"
sed_inplace "s|\[PROJECT_TYPE\]|${PROJECT_TYPE}|g"           "${AGENTS_FILE}"
sed_inplace "s|\[PRIMARY_LANGUAGES\]|${PRIMARY_LANGUAGES}|g" "${AGENTS_FILE}"
sed_inplace "s|\[PROJECT_PURPOSE\]|${PROJECT_PURPOSE}|g"     "${AGENTS_FILE}"

print_ok "AGENTS.md updated with project details."

# ── Make all scripts executable ───────────────────────────────────────────────
chmod +x "${SCRIPT_DIR}"/*.sh
print_ok "All scripts in .sdd/scripts/ are now executable."

# ── Optional: Claude Code slash commands ─────────────────────────────────────
printf '\n'
CLAUDE_COMMANDS_SRC="${SDD_DIR}/../.claude/commands"
CLAUDE_COMMANDS_DST="${PROJECT_ROOT}/.claude/commands"

# Auto-detect if .claude/ already exists in the project
if [[ -d "${PROJECT_ROOT}/.claude" ]]; then
  INSTALL_CLAUDE="y"
  print_info "Detected existing .claude/ directory — installing Claude Code commands."
else
  printf '  Set up Claude Code slash commands? (y/n): '
  read -r INSTALL_CLAUDE
fi

if [[ "${INSTALL_CLAUDE}" =~ ^[Yy]$ ]]; then
  if [[ -d "${CLAUDE_COMMANDS_SRC}" ]]; then
    mkdir -p "${CLAUDE_COMMANDS_DST}"
    cp "${CLAUDE_COMMANDS_SRC}"/*.md "${CLAUDE_COMMANDS_DST}/" 2>/dev/null || true
    print_ok "Claude Code commands installed → .claude/commands/"
  else
    print_warn ".claude/commands/ source not found in the SpecPact repo."
    print_warn "Claude Code commands were not installed."
  fi
fi

# ── Optional: GitHub Copilot agents and prompts ───────────────────────────────
printf '\n'
COPILOT_SRC_ROOT="$(cd "${SDD_DIR}/.." && pwd)/.github"
COPILOT_DST_ROOT="${PROJECT_ROOT}/.github"

# Skip prompt entirely if source and destination are the same resolved path
# (happens when SpecPact is installed at the project root — SDD_DIR/../.github IS .github).
if [[ -d "${COPILOT_SRC_ROOT}" && -d "${COPILOT_DST_ROOT}" && "${COPILOT_SRC_ROOT}" -ef "${COPILOT_DST_ROOT}" ]]; then
  print_ok "Copilot agents/prompts already in place → .github/"
else
  printf '  Set up GitHub Copilot agents and prompts? (y/n): '
  read -r INSTALL_COPILOT || INSTALL_COPILOT="n"
  if [[ "${INSTALL_COPILOT}" =~ ^[Yy]$ ]]; then
    if [[ -d "${COPILOT_SRC_ROOT}" ]]; then
      copy_bridge_dir "${COPILOT_SRC_ROOT}/agents" "${COPILOT_DST_ROOT}/agents" "Copilot agents"
      copy_bridge_dir "${COPILOT_SRC_ROOT}/prompts" "${COPILOT_DST_ROOT}/prompts" "Copilot prompts"
    else
      print_warn ".github/ source not found."
      print_warn "Copilot agents/prompts were not installed."
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
printf '\n'
printf '  %s\n' "────────────────────────────────────────"
print_ok "SpecPact initialised for: ${PROJECT_NAME}"
printf '\n'
print_info "Next steps:"
print_info "  1. Complete .sdd/memory/AGENTS.md — fill in stack, principles, conventions"
print_info "  2. Complete .sdd/memory/architecture.md — describe your service layout"
print_info "  3. Create your first spec:"
print_info "       .sdd/scripts/new-spec.sh nano   my-first-fix"
print_info "       .sdd/scripts/new-spec.sh feature my-first-feature"
print_info "       .sdd/scripts/new-spec.sh system  my-first-architecture-change"
printf '\n'