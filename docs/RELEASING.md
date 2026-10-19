# Build, tag, and download releases

The [Build and release workflow](../.github/workflows/build.yml) builds Windows x64 installers. It runs formatting, lint, translations, frontend compilation, release-script tests, and Rust tests before packaging. It uses the repository's `GITHUB_TOKEN`; no signing secrets are required.

## Download

Open [Latest release](https://github.com/Ackley23/sticky-notes/releases/latest) and expand **Assets**:

- `*_x64-setup.exe`: recommended Windows installer (NSIS).
- `*_x64_*.msi`: Windows Installer package.
- `SHA256SUMS.txt`: SHA-256 checksums for both downloads.

Installers are unsigned. Windows may show a SmartScreen warning. In-app automatic updates are not configured; install a newer release manually. Only Windows x64 is packaged by this workflow; macOS and Linux still need platform testing.

## Release from the GitHub website

1. Merge the desired changes into `main`.
2. Open **Actions → Build and release → Run workflow**, select `main`, and run it.
3. After checks and packaging pass, the workflow creates a `vX.Y.Z` tag at the built commit and publishes the installers under **Releases**. It also puts the download link in the workflow summary.

The first release can use the existing `0.1.0` version. For later releases, increase the version in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the app's entry in `src-tauri/Cargo.lock` together, or use the script below. A manual run refuses to reuse a version tag belonging to a different commit. Re-running the same tag replaces its download assets.

## Release from the command line

From a clean, up-to-date `main` branch:

```sh
pnpm check
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
pnpm release:version 0.1.1 --push
```

The script accepts stable `X.Y.Z` versions greater than the current version. It checks local and remote tags, updates all four version files, creates a release commit and annotated tag, and pushes `main` and the tag atomically. Without `--push`, it prepares the commit and tag locally and prints the push command. If pushing fails, the commit and tag remain available to retry; do not rerun the version command.

To publish the existing version without a bump, use the website workflow or create the initial tag:

```sh
git tag -a v0.1.0 -m "Sticky Notes v0.1.0"
git push origin v0.1.0
```

Tag pushes must match the committed app version. The workflow creates a public release only after installers and checksums exist. Publication needs repository Actions enabled and permission for `GITHUB_TOKEN` to write repository contents. A tag created by a workflow token does not trigger another workflow; the manual run builds and publishes in the same run.

## Builds without a release

Pushes to `main` and pull requests targeting `main` run the same checks and packaging. Download `sticky-notes-windows-x64` from the workflow's **Artifacts** section while signed into GitHub (retained for 14 days). These builds do not create tags or Releases.

## Local checks

```sh
node scripts/release-version.mjs --check
node --test scripts/release-version.test.mjs
pnpm tauri:build --bundles nsis,msi -- --locked
```

References: [Tauri GitHub distribution](https://v2.tauri.app/distribute/pipelines/github/), [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
