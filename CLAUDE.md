# Sticky Notes repository guidance

Current product entry point: `src/main.tsx` → `src/App.tsx`.
Persistence and shared types: `src/store.ts`; Rust IPC and SQLite: `src-tauri/src/lib.rs`.
Read `README.md` and `docs/implementation-status.md` for current behavior and known limits.

The source was copied from `C:\dev\vm_shared\tauri-app-template`. Original components and template guides are retained for reference; they are not the active application UI. Do not infer cloud sync or updater availability from the original template documentation.

Validate changes with `pnpm check` and `cargo test --manifest-path src-tauri/Cargo.toml --lib`. Use async Tauri commands when creating WebView windows on Windows to avoid main-thread deadlock.

Keep user data out of Git. Commit coherent, validated milestones during development as requested by the project owner. Never commit node_modules, dist, target, local SQLite databases, or personal exports.
