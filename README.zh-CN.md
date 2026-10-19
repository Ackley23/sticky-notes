# Sticky Notes 便利贴

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

基于 **Tauri 2、React 19 和 TypeScript** 的本地优先桌面便利贴应用。随手记录灵感、待办事项和参考信息，让便笺陪伴日常工作。

[GitHub 项目](https://github.com/Ackley23/sticky-notes) · [问题反馈](https://github.com/Ackley23/sticky-notes/issues) · [版本发布](https://github.com/Ackley23/sticky-notes/releases)

![Sticky Notes 工作台](screenshots/sticky-notes-workspace.jpg)

## 功能特色

- **便笺工作台**：八种颜色、标签、全文搜索、颜色筛选、固定、归档、网格／列表及排序。
- **富文本编辑**：粗体、斜体、下划线、删除线、待办清单、项目／编号列表、字号调整及随主题切换的文字高亮。
- **图片**：粘贴或导入单张不超过 8 MB 的图片，可缩放、删除和另存。
- **独立桌面便笺**：默认阅读模式，通过左上角的编辑／完成按钮切换；最小尺寸为 200 × 160 逻辑像素。
- **置顶与透明度**：失焦不透明度可设为 30–100%，调整时实时预览；关闭预览后仅在置顶且失焦时生效。
- **安静阅读**：失焦且鼠标未停留时隐藏工具栏，失焦滚动条缩窄为 3 px；可隐藏系统标题栏，通过拖动工具栏空白处移动。
- **重启恢复**：保存已打开便笺的位置、尺寸和置顶状态；手动关闭或删除的便笺不会重新弹出，原显示器不可用时移回可见范围。
- **系统托盘**：点击图标切换主窗口显示／隐藏；关闭主窗口后仍在后台运行，从托盘菜单选择退出才会结束应用。
- **Windows 自动启动**：在设置与偏好中控制是否在 Windows 登录时启动。
- **主题与语言**：浅色、深色、跟随系统；英语、繁体中文、简体中文，偏好实时同步到便笺窗口。
- **本地自动保存**：桌面使用 SQLite，浏览器预览使用 IndexedDB；回收站保留 30 天，可恢复误删便笺。
- **提醒**：指定时间、倒计时预设、音效、自定义铃声及延后提醒。
- **隐私遮罩**：四位 PIN 隐藏便笺内容，列表和搜索也不显示私人标题／正文；此功能不会加密数据。
- **智能链接与导出**：网址、邮箱、电话号码、结构化日期及支持格式的地址；Markdown／JSON 导出、JSON 备份导入、通过系统打印保存 PDF。

## 下载与发布

从[最新版本](https://github.com/Ackley23/sticky-notes/releases/latest)下载 Windows x64 `.exe` 或 `.msi` 安装包。GitHub Actions 会在推送 `main` 和 Pull Request 时自动检查、构建及打包；推送 `vX.Y.Z` tag，或在 GitHub 的 **Actions → Build and release → Run workflow** 选择 `main` 执行，即会自动创建版本标签与 Release 并提供下载。安装包尚未签名，应用内自动更新尚未配置。

后续版本可在干净的 `main` 执行 `pnpm release:version 0.1.1 --push`，同步版本号、创建提交与 tag 并推送。详细操作见[发布指南](docs/RELEASING.md)。

## 开发与运行

请先安装 Node.js、pnpm、Rust 及各平台所需的 Tauri 构建工具。Windows 需要 MSVC 构建工具和 WebView2。

```sh
git clone git@github.com:Ackley23/sticky-notes.git
cd sticky-notes
pnpm install
pnpm tauri:dev
```

也可以使用 HTTPS 克隆项目：

```sh
git clone https://github.com/Ackley23/sticky-notes.git
```

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 浏览器预览，http://localhost:1420 |
| `pnpm tauri:dev` | 桌面开发模式 |
| `pnpm build` | TypeScript 和前端生产构建 |
| `pnpm tauri:build` | 在当前操作系统构建桌面安装包 |
| `pnpm check` | 格式、Lint、多语言检查及前端构建 |
| `pnpm i18n:check` | 检查三套界面翻译 |
| `cargo test --manifest-path src-tauri/Cargo.toml --lib` | Rust 存储与会话测试 |

浏览器预览不提供原生窗口、托盘或 Windows 自动启动功能。各操作系统需要分别构建；目前在 Windows 开发验证，macOS／Linux 仍待真机测试。macOS 透明窗口使用 Tauri 私有 API 选项，会影响 Mac App Store 上架资格。

## 快捷键

Windows／Linux 使用 Ctrl，macOS 使用 ⌘。

| 操作 | 快捷键 |
| --- | --- |
| 新建／删除当前便笺 | Ctrl/⌘ + N / D |
| 总列表／搜索 | Ctrl/⌘ + H / F |
| 粗体／斜体／下划线 | Ctrl/⌘ + B / I / U |
| 删除线 | Ctrl/⌘ + T |
| 项目列表 | Ctrl/⌘ + Shift + L |
| 增大／减小字号 | Ctrl/⌘ + Shift + > / < |
| 全局新建／唤醒总列表 | Ctrl/⌘ + Alt + N / H |

## 数据与当前范围

桌面数据位于 Tauri 的 `app_data_dir()/sticky-notes.sqlite3`，Windows 通常为 `%APPDATA%\com.david136755.stickynotes\sticky-notes.sqlite3`。请使用设置中的 JSON 导出备份，以包含 WAL 中已提交的数据；导入时会创建新便笺。

PIN 仅用于屏幕防窥，不是加密：数据库、图片和 JSON 备份包含明文内容。提醒需要程序持续运行，恢复运行时会检查逾期提醒。同一张便笺同时编辑时采用最后一次写入。

云同步目前为规划页面，尚未实现 Google Drive／OneDrive 登录与同步、协作、手机 App／桌面小组件或手写笔迹。PDF 使用系统打印对话框；自动更新尚未配置发布服务。部分文字样式无法通过标准 Markdown 保留。

验证详情见[实现状态](docs/implementation-status.md)。模板旧文档可能包含当前产品范围以外的功能。程序入口为 `src/main.tsx` → `src/App.tsx`，界面翻译位于 `src/i18n/locales/sticky-*.json`。

## 许可证

[MIT](LICENSE)。基于 Tauri App Template，保留原始许可声明。
