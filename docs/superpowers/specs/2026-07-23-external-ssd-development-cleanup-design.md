# External SSD Development Cleanup Design

**Date:** 2026-07-23  
**Repository:** `gapura-irrs2`

## Goal

Make the repository location-independent and ready for normal development and testing from its APFS external SSD location at `/Volumes/Backup/gapura-irrs2`.

## Constraints

- Preserve every tracked application file and all current uncommitted source edits.
- Treat `outputs/`, `tmp/`, and `sidang_prep/` as disposable.
- Do not copy build caches or dependencies back to the internal disk.
- Use the repository's declared Node.js 22 runtime and the committed npm lockfile.
- Do not expose or rewrite environment-variable values.

## Cleanup Scope

Remove generated content that is either stale after the repository move or safely reproducible:

- Next.js build directories: `.next/`, `.next-audit/`, and `.next-analyze/`.
- Installed JavaScript dependencies: `node_modules/`.
- TypeScript and macOS artifacts: `tsconfig.tsbuildinfo`, `next-env.d.ts`, and `.DS_Store` files.
- User-approved disposable content: `outputs/`, `tmp/`, and `sidang_prep/`.
- Obsolete local brainstorming state under `.superpowers/brainstorm/`.
- Generated `.claude-flow` daemon and metrics state containing the previous Desktop path.

The generated `.claude-flow` state will be removed from version control and ignored so future machine-specific paths and metrics do not enter commits.

## Repository Adjustments

1. Extend `.gitignore` for all disposable and machine-generated directories identified above.
2. Update the npm cleanup workflow so one command removes all rebuildable project caches and disposable outputs without touching source code or environment files.
3. Replace maintained documentation references to the former Desktop repository path with repository-relative paths. Historical Git metadata is out of scope.
4. Keep the existing `.nvmrc` value of Node.js 22 and use it for dependency installation and verification.

## Dependency Refresh

After cleanup, activate Node.js 22 and run `npm ci`. This reconstructs `node_modules/` exactly from `package-lock.json` and avoids retaining dependency state created at the previous filesystem path or under an unsupported runtime.

## Verification

Run the following from `/Volumes/Backup/gapura-irrs2` using Node.js 22:

1. Confirm the Node version check succeeds.
2. Run ESLint.
3. Run a production build.
4. Start the development server and perform an HTTP smoke check against a local route.
5. Confirm no maintained file still references the former Desktop repository path.
6. Review `git status` to verify pre-existing source edits remain and only intentional cleanup/configuration changes were added.

## Failure Handling

- If Node.js 22 is unavailable, install or activate it before dependency installation.
- If `npm ci` fails, retain its logs, diagnose the lockfile or native-package failure, and do not fall back to an unpinned install without justification.
- If lint or build failures predate the move, separate them from filesystem-relocation failures and report them without overwriting user work.
- If the external volume disconnects or becomes read-only, stop immediately rather than retrying writes against an ambiguous path.

## Expected Result

The repository can be installed, developed, linted, and built directly on the external SSD without stale Desktop references. Generated content remains reproducible and excluded from version control, while current application work remains intact.
