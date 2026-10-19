# 實作範圍與驗證紀錄

日期：2026-10-19

## GitHub 自動建置與下載發行（2026-10-19）

- 新增 `.github/workflows/build.yml`：`main` 提交與 PR 執行檢查並建置 Windows x64 NSIS／MSI，安裝包作為 Actions Artifacts 保留 14 天。
- 推送與版本相符的 `vX.Y.Z` tag，或在 GitHub 網站從 `main` 手動執行流程，會在檢查與打包成功後建立 Release、版本 tag、安裝包下載與 SHA-256 校驗檔。
- 補齊 `pnpm release:version <X.Y.Z> [--push]`，同步 package、Tauri、Cargo 與 Cargo.lock 版本，建立發版提交及 annotated tag，可原子推送 main 與 tag。
- 發版腳本測試 5 項通過，涵蓋版本檢查、Windows 換行、實際提交／tag／本機遠端推送，以及非法版本、髒工作目錄、重複 tag、版本不一致的拒絕處理。`pnpm check` 與 Rust 測試 3 項通過。
- Windows 正式打包通過：`pnpm tauri:build --bundles nsis,msi -- --locked` 產生 NSIS `.exe`（2.21 MiB）與 MSI（3.03 MiB）。
- 安裝包尚未簽章；應用內自動更新未配置。macOS／Linux 尚未納入這次自動打包。
- GitHub 遠端流程尚待首次推送後驗證。

### Windows CI 換行修正

- 首次 GitHub 執行在 `pnpm check` 的 Prettier 階段失敗：Windows 自動轉為 CRLF，造成 33 個檔案格式檢查不通過。
- 新增 `.gitattributes`，文字檔統一以 LF checkout，並更新 checkout／setup-node／pnpm setup 至使用 Node.js 24 的官方 Action 版本。
- 使用 `core.autocrlf=true` 的乾淨 checkout 重現原本 33 項錯誤；套用屬性後重新輸出檔案，Prettier 通過。本機 `pnpm check` 與 5 項發版腳本測試通過；遠端修正仍需推送後驗證。

## PRD 對照

| 層級 | 模組 | 狀態與邊界 |
| --- | --- | --- |
| 核心基礎 | 富文字／清單／字級／標注 | 已實作，使用 WebView contenteditable / execCommand；需後續在各平台驗證輸入法與復原堆疊 |
| 核心基礎 | 圖片貼上與操作 | 已實作，以 data URL 隨便箋儲存 |
| 核心基礎 | 八色與系統深色 | 已實作，依亮度選擇黑／白文字 |
| 核心基礎 | 自動儲存 | 桌面 SQLite、瀏覽器 IndexedDB，180 ms 防抖 |
| 進階管理 | 桌面獨立視窗／置頂／系統匣 | Windows 桌面版實作；macOS / Linux 尚待實機驗收 |
| 進階管理 | 搜尋／標籤／封存／垃圾桶 | 已實作；垃圾桶 30 天清理在啟動時執行 |
| 進階管理 | 全域快捷鍵 | 已實作 Ctrl / ⌘ + Alt + N / H，應用內 N / D / H |
| 進階管理 | 智慧偵測 | 網址、Email、電話、明確日期與台灣街道格式；不含自然語言「下週三」解析 |
| 進階管理 | 提醒／音效 | 應用執行期間偵測、置頂閃爍、自訂音訊；非作業系統排程服務 |
| 進階管理 | PIN 防窺 | 已實作畫面遮蔽，非資料加密 |
| 跨裝置雲端 | Markdown / JSON / PDF | 前兩者檔案下載，PDF 透過系統列印 |
| 跨裝置雲端 | Google Drive / OneDrive | 待實作：需 OAuth client、授權回呼、同步版本與衝突策略 |
| 跨裝置雲端 | Android / iOS / Widget | 待實作：需各平台專案與原生 Widget 擴充 |
| 跨裝置雲端 | 手寫筆跡 | 待實作 |

## 已執行檢查

- TypeScript 編譯通過。
- ESLint 全部 src 與 vite.config.ts 通過。
- Vite 正式前端建置通過。
- Rust SQLite 測試通過：更新一張便箋保留其他便箋、刪除指定便箋不影響其他便箋；拒絕非法／缺少 ID。
- 瀏覽器實際操作：新增便箋、輸入標題／內文／標籤、換色、關閉後搜尋、重新載入仍保留、刪除至垃圾桶、還原、深色切換。
- 首次載入開發模式範例重複建立問題已修正（穩定範例 ID）；乾淨來源驗證為 6 張。

## 後續驗收

- macOS / Linux 安裝、系統匣與全域快捷鍵。
- 圖片與 1000+ 張便箋的效能、WebView 不同版本的富文字行為。
- 相同便箋多視窗編輯衝突處理（目前最後寫入覆蓋）。
- 原生檔案對話框與 PDF 直接輸出；目前檔案下載／系統列印依 WebView 平台行為。
- 無障礙焦點圈限與更完整的螢幕閱讀器實機驗證。

補充：Windows 原生主視窗已實機開啟，SQLite 初始資料正常載入。獨立視窗白畫面問題追查為同步 Tauri command 在 Windows 建立 WebView 的執行緒阻塞，已改為 async command。

Windows 獨立便箋已重新實測：內容與富文字工具列正常顯示，原生視窗置頂按鈕可用。刪除快捷鍵改為共用編輯器的取消待儲存流程，避免快速輸入後刪除被延遲寫入復活。

最後檢查：Prettier、ESLint、TypeScript 與 Vite 皆通過。SQLite 測試 2 / 2 通過。Windows 桌面應用可建置為 `src-tauri/target/debug/sticky-notes.exe`。跨視窗主題偏好與隱藏時重新鎖定已實作；私人內容仍需依 README 所述的非加密限制使用。

## 獨立桌面便箋閱讀模式（2026-10-19）

- 獨立視窗預設為閱讀模式，隱藏標題輸入框、格式工具列與管理操作，保留內容選取與連結開啟。
- 按「編輯」進入編輯模式，按「完成」立即送出待儲存內容並回到閱讀模式。
- 「置頂／取消置頂」在兩個模式皆可用，狀態會保存；重新開啟既有視窗會套用儲存的置頂狀態並回到閱讀模式。
- 閱讀模式的待辦方框禁止修改；總清單內的編輯抽屜維持直接編輯。
- 瀏覽器驗證：預設閱讀、進出編輯、標題保存後重載、多次切換無內容殘留。前端 TypeScript、ESLint、正式建置與 SQLite 測試通過。

### Windows 原生互動驗證補驗（2026-10-19）

- 獨立便箋預設閱讀模式，不顯示格式工具列或標題輸入框。
- 按「編輯」出現富文字工具列，按「完成」返回閱讀模式。
- 開啟置頂後，將主視窗切到前景，便箋仍覆蓋在主視窗上方。
- 取消置頂後，將主視窗切到前景，主視窗可正常覆蓋便箋。
- 在編輯模式關閉後重新開啟，同一獨立視窗回到閱讀模式，已啟用的置頂狀態仍保留。
- 證據：`screenshots/desktop-view-mode.png`。測試僅切換模式與置頂，未修改便箋內容。

### 獨立便箋隱藏系統標題列（2026-10-19）

- 新增設定開關，預設保留系統標題列；偏好存於 SQLite preferences 表，不依賴單一視窗的 localStorage。
- 套用範圍限 note-* 視窗；現有視窗立即更新，新視窗與重開視窗在建立／顯示時讀取偏好，主視窗不變。
- 套用或儲存失敗會嘗試還原原先的視窗外框設定，介面顯示錯誤。
- 保留內建編輯、置頂及關閉按鈕，模式名稱／空白區使用滑鼠指標擷取與 Tauri 視窗定位，依螢幕縮放比例換算實際移動距離。
- Windows 實測通過：開關立即隱藏現有便箋的系統標題列，程式重啟後新便箋沿用設定，取消勾選即恢復系統圖示及標題列按鈕。
- 無標題列拖曳已實測：視窗由 (104, 96) 移至 (273, 202)，符合 125% 顯示縮放下的位移；編輯／完成按鈕不會觸發拖曳。
- TypeScript、ESLint、Prettier、Vite、Rust SQLite 測試與 Windows debug 建置通過；截圖見 screenshots/desktop-frameless-note.png。

### 英文／繁體中文／簡體中文（2026-10-19）

- 恢復範本 i18next 與 react-i18next 架構，保留舊範本 translation namespace，新增便箋專用 sticky namespace。
- 提供 English、繁體中文、简体中文，正規化 en-US、zh-TW、zh-HK、zh-CN、zh-SG 等系統語言代碼；選擇保存於 i18nextLng，日期與排序採對應地區格式。
- 工作板、設定、編輯器、提醒、匯出／匯入提示、顏色與無障礙標籤均已接上三語文案。新安裝範例依初始語言建立，既有資料不改寫。
- 跨視窗以 Tauri language-changed 事件與 storage 事件同步，主視窗同步翻譯系統匣顯示／退出選單。
- 翻譯檢查：3 套語系、222 個一致鍵值、217 個靜態使用鍵值，插值與區域語言映射通過。pnpm i18n:check 已整合至 pnpm check。
- 瀏覽器實測三語切換、重新載入保存與已開啟便箋即時同步。Windows 原生實測主視窗切換英文後，無標題列獨立便箋同步顯示 View mode / Edit / Always on top / Saved；原有內容保持原文。
- TypeScript、ESLint、Prettier、Vite 與 Windows debug 建置通過。截圖：screenshots/settings-language-en.jpg、screenshots/desktop-note-en.png。

### 獨立便箋閱讀模式工具列（2026-10-19）

- 閱讀模式下，滑鼠未停留且原生視窗未取得焦點時隱藏 editor-header；滑鼠移入或視窗取得焦點即顯示。編輯模式維持顯示。
- 隱藏時保留工具列高度，避免內容跳動；隱藏控制項不接受點擊或鍵盤焦點。主畫面編輯器不受影響。
- 原生焦點監聽包含初始狀態讀取、非同步競態保護與卸載清理。
- TypeScript、ESLint、Prettier、三語系檢查與 Vite 建置通過；瀏覽器確認閱讀／編輯模式切換正常。原生視窗失焦與滑鼠移入仍需實機確認。

### 置頂便箋失焦透明度（2026-10-19）

- 獨立便箋 editor-header 新增不透明度控制，30%–100%、每次 5%，預設 70%；100% 停用透明效果。
- 僅 pinned 且原生視窗失焦時套用；取得焦點或取消置頂立即恢復不透明。各便箋設定隨內容自動保存，舊資料預設 70%，匯入／載入時限制有效範圍。
- 獨立原生視窗啟用透明背景，HTML 根背景同步透明，讓底下的桌面內容可見；主視窗維持原設定。macOS 啟用 Tauri macos-private-api／macOSPrivateApi 以支援透明視窗，尚未在 macOS／Linux 實測。原生作業系統標題列不套用內容透明度。
- 實作依據：https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html#method.transparent
- TypeScript、ESLint、Prettier、三語系檢查（225 鍵）、Vite、Rust 兩項測試、Windows debug 建置通過。瀏覽器驗證滑桿數值與自動儲存；原生操作兩次偵測使用者輸入，停止 UI 測試，失焦透視效果尚待實測。

### 透明度即時預覽（2026-10-19）

- 開啟透明度設定面板時，即使視窗已取得焦點，也立即以滑桿數值預覽便箋不透明度；未置頂時也可暫時預覽。
- 關閉面板後結束預覽，恢復僅置頂且失焦時套用，100% 仍可關閉透明效果。每張便箋數值持續自動保存。
- 三語系說明同步更新；TypeScript、ESLint、三語系檢查、Vite 建置與 diff 檢查通過。

### Windows 自動啟動與精簡工具列（2026-10-19）

- 設定與偏好新增 Windows 登入時自動啟動 Sticky Notes 選項，使用 Tauri 官方 tauri-plugin-autostart；開啟設定時讀取系統狀態，啟用／停用後重新確認，錯誤顯示於設定頁。預設不自動註冊啟動。
- 僅 Windows 桌面版支援；瀏覽器與其他平台停用此選項。修改命令限定 main 視窗，只控制 Sticky Notes。安裝位置變更後需重新設定。
- 獨立便箋移除編輯／閱讀模式名稱，編輯／完成按鈕移至左側；拖曳使用工具列空白處，設定提示的三語文案同步更新。
- TypeScript、ESLint、Prettier、三語系檢查（228 鍵）、Vite 與 Rust 兩項測試通過。瀏覽器確認自動啟動選項停用、獨立便箋左側顯示 Edit 且無模式名稱。未執行 Windows 登出／重開機啟動實測。
- 官方插件：https://v2.tauri.app/plugin/autostart/

### 獨立便箋工作階段還原（2026-10-19）

- 新增 desktop_windows SQLite 資料表，保存每張獨立便箋的開啟狀態、螢幕位置與內容尺寸；移動／縮放即保存，尺寸採邏輯像素、位置採螢幕實體座標。
- 啟動後由非同步工作還原先前開啟且尚未刪除的便箋，沿用置頂、標題列偏好、閱讀模式與防窺鎖；避免在 setup 主執行緒建立 WebView 導致 Windows 死鎖。
- 自訂關閉按鈕與原生標題列關閉都取消下次自動還原；結束整個應用程式保留開啟清單。垃圾桶／永久刪除的便箋不會還原。
- 還原前檢查螢幕工作區，拔除原螢幕時改放到可見螢幕並限制尺寸與位置，避免便箋留在畫面外。
- Rust 三項測試通過，新增實體資料庫關閉／重開後的工作階段與座標保存、已關閉／已刪除篩選測試。TypeScript、ESLint、Prettier、三語系檢查、Vite 建置通過。完整原生視窗結束／重啟互動尚未實測。
