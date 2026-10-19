# Auto update status

In-app automatic updates are not configured in Sticky Notes. The current GitHub Actions workflow publishes unsigned Windows installers and checksums for manual download; it does not generate `latest.json` or updater signatures.

For building, tagging, and publishing downloads, follow [the release guide](RELEASING.md). No updater signing secrets are needed for this workflow.

Enabling automatic updates later requires a Tauri updater signing key pair, a configured public key and endpoint in `src-tauri/tauri.conf.json`, `bundle.createUpdaterArtifacts`, secure private-key storage in GitHub Actions, and a release workflow that publishes signed artifacts plus `latest.json`. These settings must be implemented and verified together before advertising automatic updates.

See [Tauri updater documentation](https://v2.tauri.app/plugin/updater/).
