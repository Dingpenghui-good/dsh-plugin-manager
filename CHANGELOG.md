# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
