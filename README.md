# dsh-plugin-plugin-manager

Writable plugin management tab for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
Shows only user-installed Cordis plugins (filters out `@deepseek-ai/` and `cordis:` built-ins),
with toggle (enable/disable) and uninstall actions.

## Features

- **Filter built-ins**: Shows only non-builtin plugins (22 user plugins visible, 187 total inventory filtered down)
- **Toggle**: Enable/disable any plugin entry via `loader.update({ disabled })`
- **Uninstall**: Remove plugin entries via `loader.remove(entryId)`
- **Expandable cards**: Click to expand showing entryId, Cordis fiber phase, and action buttons
- **Search**: Filter by module name or entry ID
- **Styling**: Matches the existing plugin-inventory tab CSS (2-column grid, status dots, chevron animations)
- **Tab label**: "自安装插件管理" (Self-installed Plugin Manager)

## Files

```
src/
├── host/
│   ├── index.ts          # PluginManagerGateway: list/toggle/uninstall RPC
│   ├── types.ts          # PluginManagerSnapshot type
│   └── invariant.ts
└── client/
    ├── client/
    │   ├── index.ts               # Settings slot registration
    │   ├── locales.ts             # zh/en i18n
    │   ├── PluginManagerSettingsTab.tsx   # Expandable card UI
    │   └── PluginManagerSettingsTab.module.css
    ├── css-modules.d.ts
    ├── index.ts
    └── invariant.ts
```

## Installation in DeepSeek Harness

Add to your agent preset's `cordis.yml`:

```yaml
plugins:
  host:
    - id: plugin-manager
      name: '@dsh-plugin/plugin-manager'
  client:
    - id: ui-settings-plugin-manager
      name: '@dsh-plugin/plugin-manager/client'
```

Or add to `packages/bundle/web-app/cordis.patch.yml`:

```yaml
host:
  - id: plugin-manager
    name: '@dsh-plugin/plugin-manager'
client:
  - id: ui-settings-plugin-manager
    name: '@dsh-plugin/plugin-manager/client'
```

Then rebuild:
```bash
npx tsc --build packages/host/plugin-manager
npx tsdown --env.DSH_BUILD_FACE host --filter "@dsh-plugin/plugin-manager"
npx tsdown --env.DSH_BUILD_FACE client --filter "@dsh-plugin/plugin-manager"
```

Restart the DSH server and open Settings → 插件 → 自安装插件管理.

## Host API

### `pluginManager.list()`
Returns `{ entries: PluginInventoryEntry[] }` — user-installed plugins only.

### `pluginManager.toggle(entryId: string, enabled: boolean)`
Toggles the `disabled` flag on a Loader entry.

### `pluginManager.uninstall(entryId: string)`
Removes a Loader entry from the tree.

## License

MIT
