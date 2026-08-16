/** Writable plugin management tab registered into Web Settings. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { PluginManagerSettingsTab } from './PluginManagerSettingsTab.tsx'
import { en, zh, type PluginManagerLocaleKey } from './locales.ts'

export type { PluginManagerSettingsTabInjected, PluginManagerSettingsTabProps } from './PluginManagerSettingsTab.tsx'
export type { PluginManagerLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Writable plugin management copy. */
    'settings.pluginManager': PluginManagerLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.pluginManager'

/** Services required by the Settings registration and generated Remote face. */
export const inject = ['slots', 'locale', 'remote', 'remote.pluginManager']

/** Contribute the lazy manager tab to the Plugins settings section. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-plugin-manager: dictionaries')

  const t = ctx.locale.bind(NS)
  const list = async () => {
    const result = await ctx.remote.pluginManager.list()
    if (!result.ok) {
      throw new Error(`pluginManager.list failed: ${result.error.code}: ${result.error.message}`)
    }
    return result.value
  }
  const toggle = async (entryId: string, enabled: boolean) => {
    const result = await ctx.remote.pluginManager.toggle(entryId, enabled)
    if (!result.ok) {
      throw new Error(`pluginManager.toggle failed: ${result.error.code}: ${result.error.message}`)
    }
  }
  const uninstall = async (entryId: string) => {
    const result = await ctx.remote.pluginManager.uninstall(entryId)
    if (!result.ok) {
      throw new Error(`pluginManager.uninstall failed: ${result.error.code}: ${result.error.message}`)
    }
  }
  const injected = () => ({ list, toggle, uninstall })

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'manager',
    order: 20,
    label: () => t('tab'),
    locale: NS,
    inject: injected,
  }, PluginManagerSettingsTab))
}
