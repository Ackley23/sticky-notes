# Sticky Notes 自黏便箋

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

以 **Tauri 2、React 19 與 TypeScript** 打造的本機優先桌面便箋。隨手記錄靈感、待辦事項與參考資訊，讓便箋陪伴日常工作。

[GitHub 專案](https://github.com/Ackley23/sticky-notes) · [問題回報](https://github.com/Ackley23/sticky-notes/issues) · [版本發行](https://github.com/Ackley23/sticky-notes/releases)

![Sticky Notes 工作板](screenshots/sticky-notes-workspace.jpg)

## 功能特色

- **便箋工作板**：八種顏色、標籤、全文搜尋、顏色篩選、釘選、封存、網格／清單與排序。
- **富文字編輯**：粗體、斜體、底線、刪除線、待辦清單、項目／編號清單、字級調整與隨主題切換的文字標注。
- **圖片**：貼上或匯入單張 8 MB 以下的圖片，可縮放、刪除與另存。
- **獨立桌面便箋**：預設閱讀模式，透過左上角「編輯／完成」切換；最小尺寸為 200 × 160 邏輯像素。
- **置頂與透明度**：失焦不透明度可設為 30–100%，調整時即時預覽；關閉預覽後僅在「置頂且失焦」時生效。
- **安靜閱讀**：失焦且滑鼠未停留時隱藏工具列，失焦捲軸縮窄為 3 px；可隱藏系統標題列，拖曳工具列空白處移動。
- **重新啟動還原**：保存已開啟便箋的位置、尺寸與置頂狀態；手動關閉或刪除的便箋不會重新彈出，原螢幕不可用時移回可見範圍。
- **系統匣**：點擊圖示切換主視窗顯示／隱藏；關閉主視窗仍會在背景執行，從系統匣選「結束」才會退出。
- **Windows 自動啟動**：在「設定與偏好」控制是否於 Windows 登入時啟動。
- **主題與語言**：淺色、深色、跟隨系統；英文、繁體中文、簡體中文，偏好即時同步至便箋視窗。
- **本機自動儲存**：桌面使用 SQLite、瀏覽器預覽使用 IndexedDB；垃圾桶保留 30 天，可還原誤刪便箋。
- **提醒**：指定時間、倒數預設、音效、自訂鈴聲與延後提醒。
- **防窺畫面**：4 位數 PIN 遮蔽便箋內容，總表與搜尋也不顯示私人標題／內文；此功能不加密資料。
- **智慧連結與匯出**：網址、Email、電話、結構化日期與支援格式的地址；Markdown／JSON 匯出、JSON 備份匯入、系統列印另存 PDF。

## 下載與發行

從[最新版本](https://github.com/Ackley23/sticky-notes/releases/latest)下載 Windows x64 `.exe` 或 `.msi` 安裝包。GitHub Actions 會在推送 `main` 與 Pull Request 時自動檢查、建置及打包；推送 `vX.Y.Z` tag，或在 GitHub 的 **Actions → Build and release → Run workflow** 選擇 `main` 執行，即會自動建立版本標籤與 Release 並提供下載。安裝包尚未簽章，應用內自動更新尚未設定。

後續版本可在乾淨的 `main` 執行 `pnpm release:version 0.1.1 --push`，同步版本號、建立提交與 tag 並推送。詳細操作見[發版指南](docs/RELEASING.md)。

## 開發與執行

請先安裝 Node.js、pnpm、Rust 與各平台所需的 Tauri 建置工具。Windows 需 MSVC 建置工具與 WebView2。

```sh
git clone git@github.com:Ackley23/sticky-notes.git
cd sticky-notes
pnpm install
pnpm tauri:dev
```

也可以使用 HTTPS 複製專案：

```sh
git clone https://github.com/Ackley23/sticky-notes.git
```

| 指令 | 用途 |
| --- | --- |
| `pnpm dev` | 瀏覽器預覽，http://localhost:1420 |
| `pnpm tauri:dev` | 桌面開發模式 |
| `pnpm build` | TypeScript 與前端正式建置 |
| `pnpm tauri:build` | 在目前作業系統建置桌面安裝包 |
| `pnpm check` | 格式、Lint、語系檢查與前端建置 |
| `pnpm i18n:check` | 檢查三套介面翻譯 |
| `cargo test --manifest-path src-tauri/Cargo.toml --lib` | Rust 儲存與工作階段測試 |

瀏覽器預覽不提供原生視窗、系統匣或 Windows 自動啟動功能。各作業系統需分別建置；目前在 Windows 開發驗證，macOS／Linux 尚待實機測試。macOS 透明視窗使用 Tauri 私有 API 選項，會影響 Mac App Store 上架資格。

## 快捷鍵

Windows／Linux 使用 Ctrl，macOS 使用 ⌘。

| 操作 | 快捷鍵 |
| --- | --- |
| 新增／刪除目前便箋 | Ctrl/⌘ + N / D |
| 總清單／搜尋 | Ctrl/⌘ + H / F |
| 粗體／斜體／底線 | Ctrl/⌘ + B / I / U |
| 刪除線 | Ctrl/⌘ + T |
| 項目清單 | Ctrl/⌘ + Shift + L |
| 放大／縮小字級 | Ctrl/⌘ + Shift + > / < |
| 全域新增／喚醒總清單 | Ctrl/⌘ + Alt + N / H |

## 資料與目前範圍

桌面資料位於 Tauri 的 `app_data_dir()/sticky-notes.sqlite3`，Windows 通常是 `%APPDATA%\com.david136755.stickynotes\sticky-notes.sqlite3`。請使用設定中的 JSON 匯出備份，以包含 WAL 中已提交的資料；匯入時會建立新便箋。

PIN 僅用於畫面防窺，不是加密：資料庫、圖片與 JSON 備份包含明文內容。提醒需要程式持續執行，恢復執行時會檢查逾期提醒。同一張便箋同時編輯採最後一次寫入。

雲端同步目前為規畫頁面，尚未實作 Google Drive／OneDrive 登入與同步、協作、手機 App／Widget 或手寫筆跡。PDF 使用系統列印對話框；自動更新尚未設定發行服務。部分文字樣式無法以標準 Markdown 保留。

驗證細節見[實作狀態](docs/implementation-status.md)。範本舊文件可能包含目前產品範圍以外的功能。程式入口為 `src/main.tsx` → `src/App.tsx`，介面翻譯位於 `src/i18n/locales/sticky-*.json`。

## 授權

[MIT](LICENSE)。以 Tauri App Template 為基底，保留原始授權聲明。
