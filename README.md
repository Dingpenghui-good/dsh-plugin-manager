# @dsh-plugin/plugin-manager

DeepSeek Harness 插件管理器 — 在设置界面中管理用户安装的 Cordis 插件。

## 功能

- **已安装插件列表** — 显示所有用户安装的插件（自动过滤内置插件）
- **启用/禁用** — 一键切换插件状态
- **卸载** — 移除已安装的插件（需要确认）
- **搜索过滤** — 快速定位插件
- **双语支持** — 中文 / English
- **状态指示** — 显示 Cordis fiber 阶段（挂载中/已挂载/失败等）

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
      name: '@dsh-plugin/plugin-manager'
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

# 安装依赖并构建
npm install
npm run build

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
| Package | `@dsh-plugin/plugin-manager` |
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
# 安装依赖
npm install

# 构建（生产）
npm run build

# 开发模式（监听文件变化）
npm run dev
```

> ⚠️ **必须执行 `npm run build`**，插件运行时依赖 `lib/` 下的构建产物，不能直接使用源码。

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
