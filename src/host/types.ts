import type { PluginInventoryEntry } from '@deepseek-ai/dsh-host-plugin-inventory/types'

/** Point-in-time snapshot of user-installed plugins returned by the manager Remote. */
export interface PluginManagerSnapshot {
  readonly entries: readonly PluginInventoryEntry[]
}
