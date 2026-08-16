/** Writable Host projection of the Cordis Loader plugin tree, filtered to user-installed plugins. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type { PluginInventoryGateway } from '@deepseek-ai/dsh-host-plugin-inventory'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
// Typert-generated ./typert and ./remote artifacts import Zod at runtime.
import type {} from 'zod'
import type { PluginManagerSnapshot } from './types.ts'

export type * from './types.ts'

/** Package names that belong to the DeepSeek Harness installation — excluded from the manager view. */
const BUILTIN_PREFIXES = [
  '@deepseek-ai/',
  'cordis:',
] as const

/** Whether one module name is a built-in Harness package. */
function isBuiltin(moduleName: string): boolean {
  return BUILTIN_PREFIXES.some(prefix => moduleName.startsWith(prefix))
}

/** Remote service exposing user-installed plugin entries from the Loader inventory. */
export class PluginManagerGateway extends TypertRemoteService {
  static inject = ['pluginInventory', 'loader']

  constructor(ctx: Context) {
    super(ctx, 'pluginManager')
  }

  /**
   * List user-installed plugins (non-builtin Loader entries) visible from this session.
   */
  @Remote('list')
  list(): PluginManagerSnapshot {
    const inventory = this.ctx.get('pluginInventory') as PluginInventoryGateway | undefined
    if (inventory === undefined) {
      return { entries: [] }
    }
    const all = inventory.list()
    return {
      entries: all.entries.filter(entry => !isBuiltin(entry.moduleName)),
    }
  }

  /**
   * Toggle the enabled state of one user-installed plugin entry.
   * When `enabled` is false, disables the entry (stops the fiber).
   * When `enabled` is true, enables the entry (starts the fiber).
   */
  @Remote('toggle')
  async toggle(entryId: string, enabled: boolean): Promise<void> {
    const loader = this.ctx.loader
    const entry = [...loader.entries()].find((e) => e.id === entryId)
    if (entry === undefined) {
      throw new Error(`plugin manager: entry "${entryId}" not found`)
    }
    await entry.update({ disabled: enabled ? null : true })
  }

  /**
   * Permanently remove one user-installed plugin entry from the loader tree.
   */
  @Remote('uninstall')
  async uninstall(entryId: string): Promise<void> {
    const loader = this.ctx.loader
    const entry = [...loader.entries()].find((e) => e.id === entryId)
    if (entry === undefined) {
      throw new Error(`plugin manager: entry "${entryId}" not found`)
    }
    await entry.parent.remove(entry.options.id)
  }
}

export default PluginManagerGateway
