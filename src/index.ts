/**
 * Writable plugin management tab for DeepSeek Harness.
 * Host entry — exposes the PluginManagerGateway Remote service.
 * Client entry (lib/client.js) is loaded separately by the DSH web runtime.
 */

export { PluginManagerGateway } from './host/index.ts'
export type { PluginManagerSnapshot } from './host/types.ts'

/** Cordis plugin identity. */
export const name = 'plugin-manager'

/** Host-side services required by the plugin gateway. */
export const inject = ['pluginInventory', 'loader'] as const
