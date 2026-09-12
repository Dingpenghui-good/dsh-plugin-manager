# @dphdph/plugin-manager

DeepSeek Harness 插件管理器 — 在设置界面中管理用户安装的 Cordis 插件。

## 功能

- **已安装插件列表** — 显示所有用户安装的插件（自动过滤内置插件）
- **启用/禁用** — 一键切换插件状态
- **卸载** — 移除已安装的插件（需要确认）
- **搜索过滤** — 快速定位插件
- **双语支持** — 中文 / English
- **状态指示** — 显示 Cordis fiber 阶段（挂载中/已挂载/失败等）

## 兼容性

| 插件版本 | DSH 版本 | 说明 |
|---------|----------|------|
| ≤ 0.2.1 | `0.1.1-rc.2` | 使用 `@deepseek-ai/dsh-client-runtime` 与旧版 Typert 注册契约 |
| ≥ 0.3.0 | `0.1.5-rc.1` | 适配异步插件清单、`TypertContribution.model`、`ctx.slots` 增强；移除已删除的 `dsh-client-runtime` |
| 0.3.1 | `0.1.5-rc.1` | 元数据修订版：修正 `package.json` 描述字段乱码，内容与 0.3.0 相同 |

> 依赖区间按预发布 semver 规则必须与目标 DSH 的 minor 元组一致：`^0.1.1-rc.2` 永远解析不到 `0.1.5-rc.1`，因此跨版本使用会静默锁死旧包。

## 安装方式

### 方式一：使用 dsh 命令（推荐）

```bash
# 安装插件
dsh plugin --profile web add <path-to-plugin>

# 例如：
cd E:\dsh-workspace\dsh-plugin-manager
dsh plugin --profile web add .
```

### 方式二：手动添加到 cordis.patch.yml

在 DeepSeek Harness 项目的 `cordis.patch.yml` 中添加：

```yaml
- insert:
    - id: plugin-manager
      name: '@dphdph/plugin-manager'
      after:
      - plugin-inventory
```

然后重新构建并重启 DSH。

### 方式三：从 GitHub 安装

```bash
# 克隆到 plugins 目录
git clone https://github.com/<your-username>/dsh-plugin-manager.git ~/.dsh/plugins/dsh-plugin-manager
# Windows: git clone https://github.com/<your-username>/dsh-plugin-manager.git %USERPROFILE%\.dsh\plugins\dsh-plugin-manager

# 进入插件目录
cd ~/.dsh/plugins/dsh-plugin-manager

# 安装依赖并构建（必须用 pnpm）
pnpm install
pnpm run build

# 添加到 DSH
dsh plugin --profile web add .
```

## 使用方法

1. 重启 DeepSeek Harness
2. 打开 **设置 → 插件 → 已安装插件**
3. 点击插件卡片展开详情
4. 使用「启用/禁用」按钮切换状态
5. 使用「卸载」按钮移除插件（需要确认）

## 技术说明

| 项目 | 值 |
|------|-----|
| Host ID | `plugin-manager` |
| Package | `@dphdph/plugin-manager` |
| Settings Slot | `settings.plugins.tab` |
| Tab 位置 | order: 20 |
| 过滤规则 | 排除 `@deepseek-ai/` 和 `cordis:` 前缀 |

## 插件结构

```
dsh-plugin-manager/
├── src/
│   ├── index.ts                  # Host 入口: PluginManagerGateway + Cordis apply
│   ├── types.ts                  # PluginManagerSnapshot 类型
│   ├── typert.remote-client.d.ts # Typert Remote 类型声明
│   └── client/
│       ├── index.ts                          # Settings slot 注册
│       ├── locales.ts                        # zh/en 国际化字典
│       ├── PluginManagerSettingsTab.tsx      # 展开式卡片 UI
│       ├── PluginManagerSettingsTab.module.css # 样式
│       └── css-modules.d.ts                  # CSS 模块类型
├── lib/                    # 构建产物（npm run build 生成）
├── cordis.patch.yml        # Cordis 配置
├── package.json
└── README.md
```

## 开发

```bash
# 安装依赖（必须用 pnpm：0.1.5-rc.1 等预发布版本在 npm 注册表不可被 npm 解析）
pnpm install

# 构建（生产）
pnpm run build

# 类型检查
pnpm run typecheck

# 运行时回归验证（挂载真实 0.1.5-rc.1 服务，31 项检查）
node runtime-verify.mjs

# 开发模式（监听文件变化）
pnpm run dev
```

> ⚠️ **必须执行 `pnpm run build`**，插件运行时依赖 `lib/` 下的构建产物，不能直接使用源码。

> `runtime-verify.mjs` 直接用插件自身 `node_modules` 中的真实 DSH 包搭建最小运行时，覆盖 Host 服务注册、Typert 严格描述符、启停可逆性、重新激活幂等性，以及客户端 `$mount` 贡献的 strict codec 契约。

## 技术说明（DSH 0.1.5 契约）

- **宿主 Typert 注册**：`pluginManager` 服务位于插件子 fiber，Gateway 的 `collectSrcClaims()` 只扫描根级服务，因此必须手动向 `ctx.typert` 注册严格调用描述符；注册的 disposer 绑定到插件 fiber，停止插件即撤回
- **重新激活**：`typert.getPackage()` 已存在时跳过重复注册，避免 "package face already registered"
- **客户端 Remote**：`ctx.remote.$mount(TYPERT_REMOTE)` 显式挂载命名空间，其返回的 disposer 绑定到插件 fiber
- **清单读取**：`PluginInventoryGateway.list()` 在 0.1.5 为异步，返回的 `entries` 经过滤后暴露给设置页

## API

### Host Remote 服务

```typescript
interface PluginManagerGateway {
  /** 列出用户安装的插件（过滤内置插件） */
  list(): Promise<{ entries: PluginInventoryEntry[] }>
  
  /** 切换插件启用状态 */
  toggle(entryId: string, enabled: boolean): Promise<void>
  
  /** 卸载插件 */
  uninstall(entryId: string): Promise<void>
}
```

## License

MIT
