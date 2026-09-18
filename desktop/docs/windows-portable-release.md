# Windows 便携版发布与验收

当前产物是未签名的便携 ZIP，解压后运行 `Felix.exe`。它不是安装器；Git、受支持的浏览器和模型服务配置仍由运行环境提供。SHA-256 用于检测文件损坏，不证明发布者身份。

## 构建

在仓库根目录使用 Node 和 pnpm，选择尚不存在的输出目录：

```powershell
pnpm --dir desktop run build
node desktop/scripts/bundle-runtime.cjs .project-cache/runtime-new
node desktop/scripts/bundle-desktop.cjs .project-cache/desktop-new .project-cache/runtime-new
node desktop/scripts/verify-desktop.cjs .project-cache/desktop-new
node desktop/scripts/bundle-portable.cjs .project-cache/desktop-new .project-cache/release-new
```

运行时组装需要已构建的 Codex app-server 和网络获取的 Node 许可证；也可以复用经 `verify:runtime` 验证的已有运行时目录。便携版组装使用 Windows 自带的 `tar.exe`。目录包包含完整文件清单，打包前后校验所有文件；已有输出目录不会被覆盖。

输出目录包含 `Felix-portable.zip`、`SHA256SUMS.txt` 和使用说明 `README.txt`。完整解压 ZIP 后，`release-manifest.json` 可用于逐文件验证。不要只复制 `Felix.exe`。

## 验收

```powershell
node --test desktop/tests/desktop-manifest.test.cjs desktop/tests/bundle-portable.test.cjs desktop/tests/third-party-notices.test.cjs
node desktop/tests/portable-release.cjs .project-cache/release-new
```

第二条命令检查 ZIP 校验值、解压文件清单和第三方组件/许可证覆盖，再调用真实打包应用验收：移动到仓库外含空格路径，启动 Electron，连接内置 app-server、检查图片解码和原生终端，保存提醒后关闭并重启确认恢复。使用临时用户数据目录，不修改日常 Felix 配置。

2026-09-19 在开发 Windows 主机从已提交源码独立构建并通过该流程，最新产物位于 `.project-cache/felix-portable-20260919`；源码版本、复用运行时和校验值见 [本次发布记录](release-2026-09-19.md)。尚未验证干净 Windows VM、签名安装器或其他平台；发布许可清单审计仍未完成。

## 第三方组件清单

Vite 的生产构建从输出 chunk 的模块记录提取 npm 包身份和许可证文本，生成 `dist/third-party-licenses.json`。目录打包结合实际复制的桌面 npm 依赖，生成根目录的 `THIRD-PARTY-COMPONENTS.json` 和 `THIRD-PARTY-NOTICES.txt`；两者均进入发布完整性清单。

当前包记录 13 个前端组件和 13 个桌面 npm 组件，另索引 Electron/Chromium、Node 和 Codex 的包内许可证。机器清单的 `reviewRequired` 保留未完成审计项；缺少许可文本或元数据的组件会被显式列出。此清单不是完整法律审查结论，Codex 的 Rust 传递依赖及原生二进制的传递依赖仍需审计。
