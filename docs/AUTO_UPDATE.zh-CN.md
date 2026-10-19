# 自动更新状态

Sticky Notes 尚未配置应用内自动更新。目前的 GitHub Actions 工作流发布未签名的 Windows 安装包及校验文件，供用户手动下载；不会生成 `latest.json` 或更新签名。

自动构建、版本标签与下载发布请参阅[发布指南](RELEASING.md)。当前流程不需要更新签名密钥。

后续启用自动更新需要同时配置 Tauri 更新签名密钥对、`src-tauri/tauri.conf.json` 中的公钥和更新地址、`bundle.createUpdaterArtifacts`、GitHub Actions 中安全保存的私钥，以及发布签名安装包和 `latest.json` 的工作流。必须完成并验证整套流程后才能提供自动更新。

参考 [Tauri 更新插件文档](https://v2.tauri.app/plugin/updater/)。
