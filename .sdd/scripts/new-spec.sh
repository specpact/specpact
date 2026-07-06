#!/usr/bin/env bash
# =============================================================================
# SpecPact — new-spec.sh
# Bootstrap a new spec from a template.
#
# Usage: .sdd/scripts/new-spec.sh <mode> <spec-id>
#
#   mode     — nano | feature | system
#   spec-id  — kebab-case slug, e.g. freight-matching, fix-null-carrier-id
# =============================================================================
set -euo pipefail

# ── Resolve paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDD_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Helpers ───────────────────────────────────────────────────────────────────
print_ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
print_err()  { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; }
print_info() { printf '  %s\n' "$1"; }

# Portable in-place sed. Works on BSD sed (macOS) and GNU sed (Linux).
sed_inplace() {
  local expression="$1"
  local file="$2"
  sed -i.bak "$expression" "$file"
  rm -f "${file}.bak"
}

print_usage() {
  printf '\n'
  print_info "Usage: .sdd/scripts/new-spec.sh <mode> <spec-id>"
  printf '\n'
  print_info "Modes:"
  print_info "  nano     — bug fix, small tweak, targeted refactor (touches ≤ 3 files)"
  print_info "  feature  — new user-facing or system-facing capability"
  print_info "  system   — architectural change, new service, data model overhaul"
  printf '\n'
  print_info "spec-id rules:"
  print_info "  • Lowercase letters, numbers, and hyphens only"
  print_info "  • Must start and end with a letter or number"
  print_info "  • Examples: freight-matching, fix-null-carrier-id, auth-jwt-migration"
  printf '\n'
  print_info "Examples:"
  print_info "  .sdd/scripts/new-spec.sh nano    fix-null-carrier-id"
  print_info "  .sdd/scripts/new-spec.sh feature freight-matching"
  print_info "  .sdd/scripts/new-spec.sh system  collector-v2-architecture"
  printf '\n'
}

# ── Argument validation ───────────────────────────────────────────────────────
MODE="${1:-}"
SPEC_ID="${2:-}"

if [[ -z "${MODE}" || -z "${SPEC_ID}" ]]; then
  print_usage
  exit 1
fi

# Validate mode
if [[ "${MODE}" != "nano" && "${MODE}" != "feature" && "${MODE}" != "system" ]]; then
  printf '\n'
  print_err "Invalid mode: '${MODE}'"
  print_err "Mode must be one of: nano, feature, system"
  printf '\n'
  exit 1
fi

# Validate spec-id: lowercase letters, numbers, hyphens; no leading/trailing hyphen
# Compatible with both bash 3.2 (macOS) and bash 5.x — uses grep, not =~
if ! printf '%s' "${SPEC_ID}" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'; then
  printf '\n'
  print_err "Invalid spec-id: '${SPEC_ID}'"
  print_err "spec-id must contain only lowercase letters, numbers, and hyphens."
  print_err "It must start and end with a letter or number."
  print_err "Examples: freight-matching, fix-null-carrier, auth-v2"
  printf '\n'
  exit 1
fi

# ── Duplicate check ───────────────────────────────────────────────────────────
SPEC_DIR="${SDD_DIR}/specs/${SPEC_ID}"

if [[ -d "${SPEC_DIR}" ]]; then
  printf '\n'
  print_err "A spec with this ID already exists: .sdd/specs/${SPEC_ID}/"
  print_err "To update it, run: .sdd/scripts/update-spec.sh ${SPEC_ID}"
  printf '\n'
  exit 1
fi

# ── Preflight: templates must exist ──────────────────────────────────────────
SPEC_TEMPLATE="${SDD_DIR}/templates/spec-${MODE}.md"
NOTES_TEMPLATE="${SDD_DIR}/templates/notes.md"

if [[ ! -f "${SPEC_TEMPLATE}" ]]; then
  printf '\n'
  print_err "Template not found: .sdd/templates/spec-${MODE}.md"
  print_err "The .sdd/ directory may be incomplete. Re-install SpecPact."
  printf '\n'
  exit 1
fi

if [[ "${MODE}" != "nano" && ! -f "${NOTES_TEMPLATE}" ]]; then
  printf '\n'
  print_err "Template not found: .sdd/templates/notes.md"
  print_err "The .sdd/ directory may be incomplete. Re-install SpecPact."
  printf '\n'
  exit 1
fi

# ── Compute substitution values ───────────────────────────────────────────────
TODAY="$(date +%Y-%m-%d)"

# Title: replace hyphens with spaces, then capitalise first letter.
# We use tr for the hyphen replacement (POSIX, no GNU dependency).
# The capitalisation uses a shell parameter expansion compatible with bash 3.2+.
RAW_TITLE="$(printf '%s' "${SPEC_ID}" | tr '-' ' ')"
# Capitalise first character — compatible with bash 3.2
FIRST_CHAR="$(printf '%s' "${RAW_TITLE}" | cut -c1 | tr '[:lower:]' '[:upper:]')"
REST_CHARS="$(printf '%s' "${RAW_TITLE}" | cut -c2-)"
SPEC_TITLE="${FIRST_CHAR}${REST_CHARS}"

# ── Create spec directory and files ───────────────────────────────────────────
mkdir -p "${SPEC_DIR}"

# Copy and stamp spec.md
cp "${SPEC_TEMPLATE}" "${SPEC_DIR}/spec.md"
sed_inplace "s|\[SPEC_ID\]|${SPEC_ID}|g"       "${SPEC_DIR}/spec.md"
sed_inplace "s|\[SPEC_TITLE\]|${SPEC_TITLE}|g" "${SPEC_DIR}/spec.md"
sed_inplace "s|\[SPEC_DATE\]|${TODAY}|g"        "${SPEC_DIR}/spec.md"
# [SPEC_AUTHOR] is intentionally left for the developer to fill in.
# [ADR_NUMBER] (system mode only) is intentionally left for the developer.

# Copy and stamp notes.md for feature and system modes
if [[ "${MODE}" != "nano" ]]; then
  cp "${NOTES_TEMPLATE}" "${SPEC_DIR}/notes.md"
  sed_inplace "s|\[SPEC_ID\]|${SPEC_ID}|g" "${SPEC_DIR}/notes.md"
fi

# ── Output ────────────────────────────────────────────────────────────────────
printf '\n'
print_ok "New ${MODE} spec created: .sdd/specs/${SPEC_ID}/"
printf '\n'
print_info "Files created:"
print_info "  .sdd/specs/${SPEC_ID}/spec.md"
if [[ "${MODE}" != "nano" ]]; then
  print_info "  .sdd/specs/${SPEC_ID}/notes.md   (ephemeral — delete when spec reaches stable)"
fi
printf '\n'
print_info "What to do now:"
print_info "  1. Open .sdd/specs/${SPEC_ID}/spec.md and fill in every section."
if [[ "${MODE}" == "system" ]]; then
  print_info "  2. Add the corresponding ADR entry to .sdd/memory/decisions.md."
  print_info "  3. Resolve all open questions before setting status to in-progress."
  print_info "  4. Load into your AI tool when ready:"
elif [[ "${MODE}" == "feature" ]]; then
  print_info "  2. Resolve all open questions before setting status to in-progress."
  print_info "  3. Load into your AI tool when ready:"
else
  print_info "  2. Load into your AI tool when ready:"
fi
print_info "       Claude Code:  /spec-load ${SPEC_ID}"
print_info "       Other tools:  paste .sdd/modes/${MODE}.md + spec.md into context"
printf '\n'
print_info "Status flow:  draft → in-progress → stable → deprecated"
printf '\n'