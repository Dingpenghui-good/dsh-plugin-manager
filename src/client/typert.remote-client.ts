/* Client-side Typert Remote contribution for the plugin manager Gateway.
 * Mounted explicitly by the client apply() so that ctx.remote.pluginManager
 * becomes available before any slot code reads it. */
import { z } from 'zod'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'

/** Branded entry-id schema matching PluginInventoryEntry.entryId wire shape. */
const EntryIdSchema = z.intersection(z.string(), z.unknown()) as unknown as z.ZodType<{ readonly [brand: symbol]: string }>

const pluginManagerListResultSchema = z.object({
  entries: z.array(z.object({
    entryId: EntryIdSchema,
    moduleName: z.string().readonly(),
    enabled: z.boolean().readonly(),
    fiberPhase: z.union([
      z.literal(null),
      z.literal('failed'),
      z.literal('pending'),
      z.literal('active'),
      z.literal('loading'),
      z.literal('unloading'),
    ]).readonly(),
  })).readonly(),
})

export const TYPERT_REMOTE: TypertRemoteContribution = {
  package: '@dphdph/plugin-manager',
  descriptors: [
    {
      id: '@dphdph/plugin-manager#pluginManager/list',
      service: 'pluginManager',
      namespace: 'pluginManager',
      method: 'list',
      invocation: { kind: 'direct' },
      parameters: [],
      result: {
        mode: 'strict',
        typeSymbol: '@dphdph/plugin-manager/types#PluginManagerSnapshot',
        schema: pluginManagerListResultSchema,
      },
    },
    {
      id: '@dphdph/plugin-manager#pluginManager/toggle',
      service: 'pluginManager',
      namespace: 'pluginManager',
      method: 'toggle',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'entryId',
          wire: 'entryId',
          source: 'json',
          codec: { mode: 'strict', typeSymbol: 'string', schema: EntryIdSchema },
        },
        {
          name: 'enabled',
          wire: 'enabled',
          source: 'json',
          codec: { mode: 'strict', typeSymbol: 'boolean', schema: z.boolean().readonly() },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: 'void',
        schema: z.void().readonly(),
      },
    },
    {
      id: '@dphdph/plugin-manager#pluginManager/uninstall',
      service: 'pluginManager',
      namespace: 'pluginManager',
      method: 'uninstall',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'entryId',
          wire: 'entryId',
          source: 'json',
          codec: { mode: 'strict', typeSymbol: 'string', schema: EntryIdSchema },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: 'void',
        schema: z.void().readonly(),
      },
    },
  ],
}

export default TYPERT_REMOTE
