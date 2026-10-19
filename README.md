# Sticky Notes

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

A local-first desktop sticky notes app built with **Tauri 2, React 19, and TypeScript**. Keep ideas, checklists, and reference notes close to your work.

[GitHub](https://github.com/Ackley23/sticky-notes) · [Issues](https://github.com/Ackley23/sticky-notes/issues) · [Releases](https://github.com/Ackley23/sticky-notes/releases)

![Sticky Notes workspace](screenshots/sticky-notes-workspace.jpg)

## Features

- **Dashboard:** eight colors, tags, full-text search, color filters, pinning, archiving, grid/list views, and sorting.
- **Rich text:** bold, italic, underline, strikethrough, checklists, bulleted/numbered lists, font sizing, and theme-aware highlights.
- **Images:** paste or import images up to 8 MB each; resize, delete, or save embedded images.
- **Desktop notes:** independent windows open in view mode; use Edit/Done in the upper-left corner. Minimum size: 200 × 160 logical pixels.
- **Always on top and opacity:** set inactive opacity to 30–100%, with live preview while adjusting. Outside preview, transparency applies only to pinned, inactive windows.
- **Quiet reading:** the header hides when a note is inactive and the pointer is outside it; inactive scrollbars narrow to 3 px. Optional frameless windows support dragging from empty header space.
- **Session restore:** remember open desktop notes, positions, sizes, and pinning across launches. Manually closed or deleted notes stay closed; unavailable monitor positions are moved into view.
- **System tray:** click the icon to show/hide the main window. Closing the main window keeps the app running; choose Quit from the tray menu to exit.
- **Windows startup:** enable or disable automatic launch at Windows sign-in in Settings & preferences.
- **Themes and languages:** light/dark/system appearance; English, Traditional Chinese, and Simplified Chinese with synchronized window preferences.
- **Local autosave:** SQLite on desktop, IndexedDB in browser preview; deleted notes can be restored from Trash for 30 days.
- **Reminders:** scheduled times, countdown presets, sounds, custom ringtones, and snooze.
- **Privacy screen:** a four-digit PIN hides content and titles from the dashboard/search. It does not encrypt stored data.
- **Smart links and export:** URLs, email, phone numbers, structured dates, and supported addresses; Markdown/JSON export, JSON backup/import, and PDF through system printing.

## Download and releases

Download Windows x64 `.exe` or `.msi` installers from [Latest release](https://github.com/Ackley23/sticky-notes/releases/latest). GitHub Actions checks and packages every push to `main` and pull request. Push a `vX.Y.Z` tag or run **Actions → Build and release → Run workflow** on `main` to publish a release and download assets automatically. Installers are unsigned; in-app updates are not configured.

For version bumps and tagging, use `pnpm release:version 0.1.1 --push` from a clean `main`. See the [release guide](docs/RELEASING.md).

## Get started

Install Node.js, pnpm, Rust, and the platform build prerequisites for Tauri. Windows requires MSVC build tools and WebView2.

```sh
git clone git@github.com:Ackley23/sticky-notes.git
cd sticky-notes
pnpm install
pnpm tauri:dev
```

Alternatively, clone with HTTPS:

```sh
git clone https://github.com/Ackley23/sticky-notes.git
```

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Browser preview at http://localhost:1420 |
| `pnpm tauri:dev` | Desktop development |
| `pnpm build` | TypeScript and production frontend build |
| `pnpm tauri:build` | Build desktop packages on the current OS |
| `pnpm check` | Formatting, lint, localization checks, and frontend build |
| `pnpm i18n:check` | Check all three UI translation sets |
| `cargo test --manifest-path src-tauri/Cargo.toml --lib` | Rust storage/session tests |

Browser preview cannot provide native windows, tray integration, or Windows startup registration. Build separately on each target OS. Windows has been tested during development; macOS/Linux still need device testing. macOS transparency uses Tauri's private API option, which affects Mac App Store eligibility.

## Keyboard shortcuts

Use Ctrl on Windows/Linux and ⌘ on macOS.

| Action | Shortcut |
| --- | --- |
| New note / delete current note | Ctrl/⌘ + N / D |
| Dashboard / search | Ctrl/⌘ + H / F |
| Bold / italic / underline | Ctrl/⌘ + B / I / U |
| Strikethrough | Ctrl/⌘ + T |
| List | Ctrl/⌘ + Shift + L |
| Increase / decrease font size | Ctrl/⌘ + Shift + > / < |
| Global new note / show dashboard | Ctrl/⌘ + Alt + N / H |

## Data and current scope

Desktop data is stored at Tauri's `app_data_dir()/sticky-notes.sqlite3`. On Windows this is usually `%APPDATA%\com.david136755.stickynotes\sticky-notes.sqlite3`. Use JSON export in Settings to back up notes, including committed WAL data. Imports create new notes.

The PIN is a screen privacy feature, not encryption: the database, images, and JSON backups contain readable content. Reminders require the app to be running; overdue reminders are checked when it resumes. Concurrent edits to the same note use the last write.

Cloud sync is a roadmap screen. Google Drive/OneDrive login and synchronization, collaboration, mobile apps/widgets, and handwriting are not implemented. PDF uses the system print dialog; automatic update distribution is not configured. Some styling cannot be represented in standard Markdown.

See [implementation status](docs/implementation-status.md) for verification details. Legacy template documents may describe features outside the current scope. Entry point: `src/main.tsx` → `src/App.tsx`; UI translations: `src/i18n/locales/sticky-*.json`.

## License

[MIT](LICENSE). Built on the Tauri App Template; the original license notice is retained.
