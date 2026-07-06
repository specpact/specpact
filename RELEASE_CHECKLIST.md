# SpecPact Release Checklist

Run this checklist before publishing a public npm release.

## 1. Start Clean

```sh
git status --short
cd cli
npm ci
```

## 2. Validate the CLI

```sh
npm run lint
npm test
npm audit --omit=dev
```

## 3. Validate Bundled Templates

```sh
npm run sync-templates
git diff --exit-code -- templates
```

If this command shows a diff, review it and commit the synced template changes before publishing.

## 4. Validate Shell Assets

```sh
cd ..
bash -n install.sh .sdd/scripts/*.sh
```

If `shellcheck` is available, run it too:

```sh
shellcheck install.sh .sdd/scripts/*.sh
```

## 5. Inspect Package Contents

```sh
cd cli
npm pack --dry-run
```

Confirm the tarball includes only the CLI, source files, README, package metadata, and bundled templates.

## 6. Dogfood a Packed Install

Create a fresh temporary project and install the packed tarball. Verify the full workflow works from the package, not local source files:

```sh
specpact init --project-name "Dogfood API" --project-type api --language "Node.js" --purpose "Temporary release test"
specpact new nano fix-health-check
specpact list
specpact verify fix-health-check
specpact update fix-health-check in-progress
specpact update fix-health-check stable
```

The release is blocked if init/new/list/verify/update fail, if specs or Memory Bank files are overwritten unexpectedly, or if the generated package contains unintended files.

## 7. Publish

Only publish after CI is green and the dogfood run passes.

```sh
cd cli
npm publish --access public
```