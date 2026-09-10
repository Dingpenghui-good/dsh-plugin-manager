import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type { PluginInventoryGateway } from '@deepseek-ai/dsh-host-plugin-inventory'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
// Type-only: pulls the TypertRegistryContract merge that adds ctx.typert.register/getPackage.
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry'
import type {} from 'zod'
import type { PluginManagerSnapshot } from './types'

export type { PluginManagerSnapshot } from './types'

/** Package names that belong to the DeepSeek Harness installation — excluded from the manager view. */
const BUILTIN_PREFIXES = [
  '@deepseek-ai/',
  'cordis:',
] as const

/** Whether one module name is a built-in Harness package. */
function isBuiltin(moduleName: string): boolean {
  return BUILTIN_PREFIXES.some(prefix => moduleName.startsWith(prefix))
}

/** Apply Remote decorator markers to class prototype methods (manual transpilation).
 *
 * TypeScript/rolldown does not transpile decorators, so we invoke the
 * `Remote()` decorator manually after class declaration.
 *
 * CRITICAL: `remoteMethods()` reads markers from
 * `Object.getPrototypeOf(service)` and uses `WeakMap.get()` which requires
 * EXACT reference equality. The marker initializer calls
 * `Object.getPrototypeOf(this)` to determine where to store the marker.
 * Therefore we must provide a `this` value whose prototype is exactly `proto`.
 */
function applyRemoteDecorators(
  proto: object,
  methods: readonly { readonly name: string }[],
): void {
  for (const { name: methodName } of methods) {
    const method = (proto as Record<string, unknown>)[methodName] as (...args: unknown[]) => unknown
    const decorator = Remote(methodName)
    decorator(
      method,
      {
        kind: 'method',
        name: methodName,
        static: false,
        private: false,
        access: { has: () => false, get: () => method },
        addInitializer: (fn: () => void) => {
          // Create a dummy object whose prototype is exactly `proto`.
          // The initializer calls `Object.getPrototypeOf(this)`, so we need
          // it to return `proto` (not some intermediate prototype).
          const dummy = Object.create(proto)
          fn.call(dummy)
        },
      } as never,
    )
  }
}

/** Remote service exposing user-installed plugin entries from the Loader inventory. */
export class PluginManagerGateway extends TypertRemoteService {
  static inject = ['pluginInventory', 'loader', 'typert']

  constructor(ctx: Context) {
    super(ctx, 'pluginManager')
  }

  /**
   * List user-installed plugins (non-builtin Loader entries) visible from this session.
   *
   * DSH 0.1.5: `PluginInventoryGateway.list()` returns a `Promise<PluginInventorySnapshot>`
   * (it may additionally resolve an agent-preset roster), so this Remote method is async.
   */
  async list(): Promise<PluginManagerSnapshot> {
    const inventory = this.ctx.get('pluginInventory') as PluginInventoryGateway | undefined
    if (inventory === undefined) {
      return { entries: [] }
    }
    const all = await inventory.list()
    return {
      entries: all.entries.filter(entry => !isBuiltin(entry.moduleName)),
    }
  }

  /**
   * Toggle the enabled state of one user-installed plugin entry.
   * When `enabled` is false, disables the entry (stops the fiber).
   * When `enabled` is true, enables the entry (starts the fiber).
   */
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
  async uninstall(entryId: string): Promise<void> {
    const loader = this.ctx.loader
    const entry = [...loader.entries()].find((e) => e.id === entryId)
    if (entry === undefined) {
      throw new Error(`plugin manager: entry "${entryId}" not found`)
    }
    await entry.parent.remove(entry.options.id)
  }
}

// Apply Remote markers after class declaration (tsdown/rolldown does not transpile decorators)
applyRemoteDecorators(PluginManagerGateway.prototype, [
  { name: 'list' },
  { name: 'toggle' },
  { name: 'uninstall' },
])

/** Cordis plugin identity. */
export const name = 'plugin-manager'

/** Host-side services required by the plugin gateway. */
export const inject = ['pluginInventory', 'loader', 'typert'] as const

/**
 * Typert invocation descriptors for our Remote methods.
 *
 * These are manually constructed because dynamic plugins run in a child fiber
 * whose services are invisible to the root-level TypertGatewayService's
 * source-claim discovery (collectSrcClaims only scans this.ctx.reflect.props).
 * Registering strict descriptors in the typert local store lets the gateway
 * resolve our endpoints via this.ctx.typert.local.get(endpoint) first.
 */
const INVOCATIONS = [
  {
    id: 'pluginManager.list',
    service: 'pluginManager',
    namespace: 'pluginManager',
    method: 'list',
    invocation: { kind: 'direct' as const },
    parameters: [],
    result: { mode: 'src-json' as const },
  },
  {
    id: 'pluginManager.toggle',
    service: 'pluginManager',
    namespace: 'pluginManager',
    method: 'toggle',
    invocation: { kind: 'direct' as const },
    parameters: [
      { name: 'entryId', wire: 'entryId', source: 'json' as const, codec: { mode: 'src-json' as const } },
      { name: 'enabled', wire: 'enabled', source: 'json' as const, codec: { mode: 'src-json' as const } },
    ],
    result: { mode: 'src-json' as const },
  },
  {
    id: 'pluginManager.uninstall',
    service: 'pluginManager',
    namespace: 'pluginManager',
    method: 'uninstall',
    invocation: { kind: 'direct' as const },
    parameters: [
      { name: 'entryId', wire: 'entryId', source: 'json' as const, codec: { mode: 'src-json' as const } },
    ],
    result: { mode: 'src-json' as const },
  },
]

/** Stable contribution identity of this plugin (also its Cordis service owner key). */
const PACKAGE_NAME = '@dphdph/plugin-manager'

/**
 * Empty package reflection.
 *
 * DSH 0.1.5 makes `TypertContribution.model` mandatory. A hand-written dynamic
 * plugin publishes no generated reflection: the Gateway resolves our endpoints
 * through the strict invocation descriptors below, never through this model.
 */
const EMPTY_MODEL = { services: [], events: [], objects: [] } as const

export function apply(ctx: Context): void {
  // Instantiate the gateway service so it registers itself as 'pluginManager'
  new PluginManagerGateway(ctx)

  const typert = ctx.get('typert')
  if (typert === undefined) return

  // A contribution owned by an earlier activation of this plugin may still be
  // live: the registry binds its own effect to the Gateway fiber, so stopping
  // this plugin does not necessarily withdraw it. Re-registering the same
  // package face is rejected outright, and the surviving descriptors stay
  // correct because they name the service, which is resolved on every call.
  if (typert.getPackage(PACKAGE_NAME, 'host') !== undefined) return

  // Register strict typert descriptors so the gateway resolves our endpoints
  // via this.ctx.typert.local.get(endpoint) instead of falling back to
  // collectSrcClaims() which cannot see services in child fibers.
  const contribution: TypertContribution = {
    package: PACKAGE_NAME,
    face: 'host',
    schemas: [],
    model: EMPTY_MODEL,
    invocations: INVOCATIONS,
  }
  // Bind the registry's disposer to this plugin's fiber so the descriptors are
  // withdrawn when the plugin stops or unloads.
  ctx.effect(() => typert.register(contribution), 'plugin-manager: typert host contribution')
}
