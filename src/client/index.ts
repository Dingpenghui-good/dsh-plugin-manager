/** Writable plugin management tab registered into Web Settings. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
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
  console.log('[plugin-manager] apply() called')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-plugin-manager: dictionaries')

  // Mount our Typert Remote contribution so ctx.remote.pluginManager exists
  // before any slot component tries to use it.
  try {
    await ctx.remote.$mount(TYPERT_REMOTE)
    console.log('[plugin-manager] TYPERT_REMOTE mounted successfully')
  } catch (error) {
    console.error('[plugin-manager] failed to mount TYPERT_REMOTE:', error)
    throw error
  }

  const t = ctx.locale.bind(NS)
  // Use ctx.get() to access the namespace service directly, avoiding the
  // inject deadlock: we create the service via $mount(), then read it back.
  const pm = () => ctx.get('remote.pluginManager') as any
  const list = async () => {
    console.log('[plugin-manager] list() called')
    try {
      const result = await pm().list()
      console.log('[plugin-manager] list() result:', result)
      if (!result.ok) {
        console.error('[plugin-manager] list failed:', result.error)
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
