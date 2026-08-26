# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
