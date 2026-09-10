/** Writable plugin management tab registered into Web Settings. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
// The Client root Context type lives on Cordis itself; DSH 0.1.5 removed the
// former @deepseek-ai/dsh-client-runtime/client re-export.
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the renderer's Context merge that declares ctx.slots.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '../typert.remote-client'
import { TYPERT_REMOTE } from './typert.remote-client'
import { PluginManagerSettingsTab } from './PluginManagerSettingsTab'
import { en, zh, type PluginManagerLocaleKey } from './locales'

export type { PluginManagerSettingsTabInjected, PluginManagerSettingsTabProps } from './PluginManagerSettingsTab'
export type { PluginManagerLocaleKey } from './locales'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Writable plugin management copy. */
    'settings.pluginManager': PluginManagerLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.pluginManager'

/** Services required by the Settings registration.
 * Note: remote.pluginManager is NOT listed here because we create it
 * ourselves via ctx.remote.$mount(TYPERT_REMOTE) inside apply().
 * Including it would create a deadlock: Cordis waits for the service,
 * but the service only exists after $mount completes, which requires
 * apply() to run, which requires Cordis to activate us first. */
export const inject = ['slots', 'locale', 'remote'] as const

/** Contribute the lazy manager tab to the Plugins settings section. */
export async function apply(ctx: ClientContext): Promise<void> {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-plugin-manager: dictionaries')

  // Mount our Typert Remote contribution so ctx.remote.pluginManager exists
  // before any slot component tries to use it.
  //
  // $mount binds its own effect to the Gateway's fiber, not ours, so the
  // returned disposer is what makes this reversible: without it a later
  // activation would find the namespace and package still claimed.
  const unmountRemote = await ctx.remote.$mount(TYPERT_REMOTE)
  ctx.effect(() => unmountRemote, 'ui-settings-plugin-manager: Remote contribution')

  const t = ctx.locale.bind(NS)
  // Use ctx.get() to access the namespace service directly, avoiding the
  // inject deadlock: we create the service via $mount(), then read it back.
  const pm = () => ctx.get('remote.pluginManager') as any
  const list = async () => {
    try {
      const result = await pm().list()
      if (!result.ok) {
        throw new Error(`pluginManager.list failed: ${result.error.code}: ${result.error.message}`)
      }
      return result.value
    } catch (error) {
      console.error('[plugin-manager] list exception:', error)
      throw error
    }
  }
  const toggle = async (entryId: string, enabled: boolean) => {
    try {
      const result = await pm().toggle(entryId, enabled)
      if (!result.ok) {
        throw new Error(`pluginManager.toggle failed: ${result.error.code}: ${result.error.message}`)
      }
    } catch (error) {
      console.error('[plugin-manager] toggle exception:', error)
      throw error
    }
  }
  const uninstall = async (entryId: string) => {
    try {
      const result = await pm().uninstall(entryId)
      if (!result.ok) {
        throw new Error(`pluginManager.uninstall failed: ${result.error.code}: ${result.error.message}`)
      }
    } catch (error) {
      console.error('[plugin-manager] uninstall exception:', error)
      throw error
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
