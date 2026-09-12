# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-09-12

### Fixed
- 修复包描述字段中的乱码字符 `‟`（U+201F，下双引号）为 `—`（em dash），保证 `package.json` 在 Node ESM 解析器与 npm registry 下干净可读
- 重发 0.3.0 的全部内容：与已发布的 0.3.0 相比，除版本号外无任何功能或代码变更，仅修正描述字段乱码

### Changed
- `README.md` 兼容性表格补充 0.3.1 行（DSH `0.1.5-rc.1`）

## [0.3.0] - 2026-09-10

### Fixed
- 适配 DSH `0.1.5-rc.1`：`PluginInventoryGateway.list()` 改为异步（返回 `Promise<PluginInventorySnapshot>`），`pluginManager.list` Remote 方法改为 `async` 并 `await` 清单快照，此前会静默返回 `entries: undefined`（清单页永远空白）
- 适配 `TypertContribution` 新增的必填字段 `model`，注册宿主 Typert 贡献时补齐空反射模型，否则类型不成立
- 客户端 `ClientContext` 改从 `@deepseek-ai/cordis` 导入：DSH 0.1.5 已删除 `@deepseek-ai/dsh-client-runtime` 包及其 `/client` 子路径
- 修复插件重新激活失败：Typert 注册的被撤回前会以 "package face already registered" 拒绝再次注册，启用/禁用自身后再启用会直接挂掉。现在注册前先查 `typert.getPackage()`，并把注册 disposer 绑定到插件 fiber，插件停止时正确撤回描述符
- 客户端 `$mount` 返回的卸载函数此前被丢弃；`$mount` 把 effect 绑在 Gateway fiber 上，不显式撤回会导致重新激活时命名空间/包名冲突。现绑定到插件 fiber
- 修复 `ctx.slots` 类型缺失：补充 `@deepseek-ai/dsh-client-ui-renderer/client` 类型导入（该包提供 `slots` 的 Context 增强）
- 补齐缺失的 `@deepseek-ai/cordis-plugin-loader` 依赖（提供 `ctx.loader` 增强与 Loader 服务）
- 移除遗留调试日志（`apply()` / `list()` 中的 `console.log`）

### Changed
- 全部 `@deepseek-ai/dsh-*` peer 依赖由 `^0.1.1-rc.2` 升级至 `^0.1.5-rc.1`（预发布 semver 规则下旧区间永远无法解析到 0.1.5-rc.1）；`@deepseek-ai/cordis` 提升至 `^4.0.2`
- 移除已不存在的 peer 依赖 `@deepseek-ai/dsh-client-runtime`；新增 `@deepseek-ai/dsh-typert-registry`、`@deepseek-ai/dsh-client-ui-renderer`
- `dsh.client.inject` 补全为 ui-settings / ui-slots / locale / api-remotes
- `tsdown.config.ts` 清理失效 external：移除 `@deepseek-ai/dsh-client-web-react`、`@deepseek-ai/dsh-client-schema-form`、`@deepseek-ai/dsh-client-runtime`，改用 `@deepseek-ai/dsh-client-web`
- 新增 `zod` devDependency（客户端 Typert codec 依赖，构建时内联进 bundle）
- `tsconfig.json` 启用 `skipLibCheck`，使插件可在 DSH 仓库之外独立做类型检查
- 新增 `runtime-verify.mjs`：针对真实 0.1.5-rc.1 服务的宿主 + 客户端运行时回归脚本（31 项检查）
- 新增 `typecheck` npm script

---

### Fixed
- DSH `0.1.5-rc.1` compatibility: `PluginInventoryGateway.list()` became asynchronous (`Promise<PluginInventorySnapshot>`). The `pluginManager.list` Remote method is now `async` and awaits the snapshot; it previously returned `entries: undefined` silently, leaving the manager tab permanently empty
- Added the new mandatory `model` field to the host `TypertContribution` registration (an empty reflection model), without which the contribution does not type-check
- The client `ClientContext` now comes from `@deepseek-ai/cordis`: DSH 0.1.5 removed the `@deepseek-ai/dsh-client-runtime` package and its `/client` subpath
- Fixed plugin reactivation: the Typert registry rejected a second registration with "package face already registered", so disabling and re-enabling the plugin broke it. Registration now checks `typert.getPackage()` first, and the registration disposer is bound to the plugin fiber so stopping the plugin withdraws its descriptors
- The disposer returned by the client `$mount` was discarded; because `$mount` binds its effect to the Gateway fiber, reactivation then collided on the namespace and package. It is now bound to the plugin fiber
- Fixed the missing `ctx.slots` type: added the `@deepseek-ai/dsh-client-ui-renderer/client` type import, which carries the `slots` Context augmentation
- Added the missing `@deepseek-ai/cordis-plugin-loader` dependency (provides the `ctx.loader` augmentation and the Loader service)
- Removed leftover debug logging (`console.log` in `apply()` / `list()`)

### Changed
- Every `@deepseek-ai/dsh-*` peer range raised from `^0.1.1-rc.2` to `^0.1.5-rc.1` (under prerelease semver rules the old range can never resolve to 0.1.5-rc.1); `@deepseek-ai/cordis` raised to `^4.0.2`
- Removed the deleted `@deepseek-ai/dsh-client-runtime` peer; added `@deepseek-ai/dsh-typert-registry` and `@deepseek-ai/dsh-client-ui-renderer`
- `dsh.client.inject` completed to ui-settings / ui-slots / locale / api-remotes
- `tsdown.config.ts` stale externals cleaned up: dropped `@deepseek-ai/dsh-client-web-react`, `@deepseek-ai/dsh-client-schema-form`, `@deepseek-ai/dsh-client-runtime`; now uses `@deepseek-ai/dsh-client-web`
- Added a `zod` devDependency (the client Typert codecs need it; it is inlined into the bundle at build time)
- `tsconfig.json` enables `skipLibCheck` so the plugin type-checks standalone outside the DSH repository
- Added `runtime-verify.mjs`: a host + client runtime regression script against the real 0.1.5-rc.1 services (31 checks)
- Added a `typecheck` npm script

## [0.2.1] - 2026-08-23

### Fixed
- 修复 `package.json` 描述字段中无效 UTF-8 字节序列（`E2 80 3F` → `E2 80 9F`），解决 Node.js ESM 解析器拒绝加载包的问题（`ERR_INVALID_PACKAGE_CONFIG`）
- 修复客户端插件在 Node.js 环境中加载失败（`window is not defined` 错误）
- 修复 Typert 端点注册，支持动态插件的 list / toggle / uninstall 接口

### Changed
- 升级 `@deepseek-ai` peer 依赖从 `^0.1.0-rc.0` 至 `^0.1.1-rc.2`
- 重构为统一入口 `src/index.ts`，移除冗余 invariant 插件，客户端插件 ID 修正为 `plugin-manager`
- 构建配置支持 host (ESM) + client (CJS) 双 bundle 输出
- 移除调试用 console.log 语句

---

### Fixed
- Fixed invalid UTF-8 byte sequence in `package.json` description field (`E2 80 3F` → `E2 80 9F`), resolving Node.js ESM resolver rejection (`ERR_INVALID_PACKAGE_CONFIG`)
- Fixed client plugin loading failure in Node.js environment (`window is not defined` error)
- Fixed Typert endpoint registration, enabling list / toggle / uninstall interfaces for dynamic plugins

### Changed
- Bumped `@deepseek-ai` peer dependencies from `^0.1.0-rc.0` to `^0.1.1-rc.2`
- Refactored to unified entry point `src/index.ts`, removed redundant invariant plugins, corrected client plugin ID to `plugin-manager`
- Build config supports host (ESM) + client (CJS) dual bundle output
- Removed debug console.log statements

## [0.2.0] - 2025-01-XX

### Added
- Add `cordis.patch.yml` for standard DSH plugin installation
- Update `package.json` with `dsh` configuration section
- Add `.npmignore` for clean package publishing
- Support for both `dsh plugin add` and manual installation methods

### Changed
- Rename tab label from "自安装插件管理" to "已安装插件"
- Simplify build scripts for easier development
- Update README with comprehensive installation guide

### Fixed
- Fix tsdown.config.ts to work standalone without workspace dependencies
- Add missing `lightningcss` devDependency

## [0.1.0] - 2025-01-XX

### Added
- Initial release
- Plugin management tab in Settings
- Toggle enable/disable user plugins
- Uninstall user plugins with confirmation
- Search/filter functionality
- Chinese and English localization
- Expandable card UI matching DSH design system
