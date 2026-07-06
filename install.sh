#!/usr/bin/env bash
# =============================================================================
# SpecPact installer
#
# Usage (recommended — run from your project root):
#   curl -fsSL https://raw.githubusercontent.com/specpact/specpact/main/install.sh | bash
#
# Usage (local clone):
#   bash /path/to/specpact/install.sh
#
# Environment variables:
#   SPECPACT_REPO    Override the source repo URL (default: GitHub main)
#   SPECPACT_BRANCH  Override the branch to clone (default: main)
#   SPECPACT_NO_AI   Set to "1" to skip .claude/ and .github/ AI bridge files
# =============================================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
REPO="${SPECPACT_REPO:-https://github.com/specpact/specpact}"
BRANCH="${SPECPACT_BRANCH:-main}"
SKIP_AI="${SPECPACT_NO_AI:-0}"
SDD_DIR=".sdd"

# ── Helpers ───────────────────────────────────────────────────────────────────
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
    print_warn "${label} already exists (${skipped} file(s) preserved)"
  fi
}

header() {
  printf '\n'
  printf '  SpecPact installer\n'
  printf '  %s\n\n' "────────────────────────────────────────"
}

cleanup() {
  rm -rf /tmp/specpact-install 2>/dev/null || true
}
trap cleanup EXIT

# ── Start ─────────────────────────────────────────────────────────────────────
header

# ── Preflight: required tools ─────────────────────────────────────────────────
if ! command -v git >/dev/null 2>&1; then
  print_err "git is required to install SpecPact."
  print_err "Install git (https://git-scm.com) and re-run this script."
  exit 1
fi

if ! command -v bash >/dev/null 2>&1; then
  print_err "bash is required to run SpecPact scripts."
  exit 1
fi

# Check bash version — warn if below 3.2
BASH_MAJOR="${BASH_VERSINFO[0]:-0}"
BASH_MINOR="${BASH_VERSINFO[1]:-0}"
if [[ "${BASH_MAJOR}" -lt 3 ]] || [[ "${BASH_MAJOR}" -eq 3 && "${BASH_MINOR}" -lt 2 ]]; then
  print_warn "Bash ${BASH_VERSION} detected. SpecPact requires Bash 3.2 or later."
  print_warn "Upgrade bash before using the scripts (current version may cause errors)."
fi

# ── Preflight: target directory ───────────────────────────────────────────────
# Warn but do not block if not in a git repo — some teams initialise git after
if [[ ! -d ".git" ]]; then
  print_warn "No .git directory found in the current directory."
  print_warn "SpecPact works best at the root of a git repository."
  print_warn "Run \`git init\` first if this is a new project."
  printf '\n'
  printf '  Install anyway? (y/n): '
  read -r CONFIRM
  if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
    print_info "Aborted. No changes made."
    exit 0
  fi
fi

# Block if .sdd/ already exists — don't silently overwrite
if [[ -d "${SDD_DIR}" ]]; then
  printf '\n'
  print_err "${SDD_DIR}/ already exists in this directory."
  print_err "SpecPact appears to already be installed."
  print_err ""
  print_err "To update SpecPact scripts and modes only (preserves your specs and memory):"
  print_err "  npx specpact upgrade"
  print_err ""
  print_err "To start fresh (WARNING: deletes all specs and memory):"
  print_err "  rm -rf .sdd/ && bash install.sh"
  exit 1
fi

# ── Download ──────────────────────────────────────────────────────────────────
print_info "Cloning SpecPact from ${REPO}..."
printf '\n'

rm -rf /tmp/specpact-install
if ! git clone --depth=1 --branch "${BRANCH}" "${REPO}" /tmp/specpact-install 2>&1 | sed 's/^/    /'; then
  printf '\n'
  print_err "Failed to clone from: ${REPO}"
  print_err "Check your internet connection and try again."
  print_err "Or install manually: see README.md for instructions."
  exit 1
fi

printf '\n'

# ── Verify download integrity ─────────────────────────────────────────────────
if [[ ! -d "/tmp/specpact-install/.sdd" ]]; then
  print_err "Download appears incomplete — .sdd/ not found in the cloned repo."
  print_err "Try again or install manually."
  exit 1
fi

REQUIRED_SCRIPTS="init.sh new-spec.sh list-specs.sh verify.sh update-spec.sh"
for script in ${REQUIRED_SCRIPTS}; do
  if [[ ! -f "/tmp/specpact-install/.sdd/scripts/${script}" ]]; then
    print_err "Download appears incomplete — .sdd/scripts/${script} not found."
    print_err "Try again or install manually."
    exit 1
  fi
done

# ── Install core (.sdd/) ──────────────────────────────────────────────────────
cp -r /tmp/specpact-install/.sdd "${SDD_DIR}"
chmod +x "${SDD_DIR}/scripts/"*.sh
print_ok "Core installed: .sdd/"

# ── Install AI bridges (optional) ────────────────────────────────────────────
if [[ "${SKIP_AI}" == "1" ]]; then
  print_info "AI bridge files skipped (SPECPACT_NO_AI=1)."
else
  # Claude Code slash commands
  if [[ -d "/tmp/specpact-install/.claude" ]]; then
    if [[ -d ".claude" ]]; then
      # .claude/ exists — merge commands only, don't overwrite other content
      mkdir -p ".claude/commands"
      cp /tmp/specpact-install/.claude/commands/*.md .claude/commands/ 2>/dev/null || true
      print_ok "Claude Code commands merged into existing .claude/commands/"
    else
      cp -r /tmp/specpact-install/.claude .claude
      print_ok "Claude Code commands installed: .claude/commands/"
    fi
  fi

  # GitHub Copilot agents and prompt files
  if [[ -d "/tmp/specpact-install/.github" ]]; then
    copy_bridge_dir "/tmp/specpact-install/.github/agents" ".github/agents" "Copilot agents"
    copy_bridge_dir "/tmp/specpact-install/.github/prompts" ".github/prompts" "Copilot prompts"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
printf '\n'
printf '  %s\n' "────────────────────────────────────────"
print_ok "SpecPact installed successfully."
printf '\n'
print_info "Installed:"
printf '    .sdd/memory/     ← Memory Bank (fill these in)\n'
printf '    .sdd/specs/      ← Spec store (example specs included)\n'
printf '    .sdd/modes/      ← Mode rules (nano, feature, system)\n'
printf '    .sdd/scripts/    ← Shell scripts\n'
printf '    .sdd/templates/  ← Spec templates\n'
printf '\n'
print_info "Next step — run the setup wizard:"
printf '\n'
printf '    .sdd/scripts/init.sh\n'
printf '\n'
print_info "Then create your first spec:"
printf '\n'
printf '    .sdd/scripts/new-spec.sh nano    my-first-fix\n'
printf '    .sdd/scripts/new-spec.sh feature my-first-feature\n'
printf '\n'
print_info "See README.md for the full quick-start guide."
printf '\n'