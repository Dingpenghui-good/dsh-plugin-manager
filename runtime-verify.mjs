/**
 * Runtime verification for @dphdph/plugin-manager against DSH 0.1.5-rc.1.
 *
 * Mounts the BUILT host bundle (lib/index.js) on a real Cordis root with the
 * real @deepseek-ai/dsh-typert-registry and the real PluginInventoryGateway,
 * then exercises the gateway surface and the Loader mutations. The client
 * bundle (lib/client.js) is loaded through the same
 * `window.__ModuleLoader__` protocol the browser uses, and the contribution it
 * hands to `ctx.remote.$mount()` is checked against the 0.1.5 client contract.
 *
 * Run: node runtime-verify.mjs
 */
import { Context } from '@deepseek-ai/cordis'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import { PluginInventoryGateway } from '@deepseek-ai/dsh-host-plugin-inventory'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import * as plugin from './lib/index.js'

const PACKAGE_NAME = '@dphdph/plugin-manager'
const FIBER_ACTIVE = 2

const failures = []
function check(label, ok, extra) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra === undefined ? '' : `  (${extra})`}`)
  if (!ok) failures.push(label)
}

/** One fake Loader entry carrying the observable mutations the plugin performs. */
function makeEntry(id, name, { disabled = false, group = false } = {}) {
  const calls = { updates: [], removed: [] }
  return {
    id,
    options: { id, name, group },
    disabled,
    fiber: { state: FIBER_ACTIVE },
    parent: { remove: async removedId => { calls.removed.push(removedId) } },
    async update(options) { calls.updates.push(options) },
    calls,
  }
}

const entries = [
  makeEntry('base', '@deepseek-ai/dsh-base', { group: true }),   // builtin + group
  makeEntry('web', '@deepseek-ai/dsh-web-app'),                  // builtin
  makeEntry('timer', 'cordis:timer'),                            // builtin prefix
  makeEntry('serper', '@dingpenghui/dsh-web-search-serper'),     // user-installed
  makeEntry('manager', PACKAGE_NAME, { disabled: true }),        // user-installed, disabled
  makeEntry('broken', 'dsh-broken-plugin', { disabled: true }),  // user-installed, disabled
]
const byId = new Map(entries.map(entry => [entry.id, entry]))

const fakeLoader = {
  *entries() { for (const entry of entries) yield entry },
}

const ctx = new Context()
ctx.provide('loader', fakeLoader)
await ctx.plugin(TypertRegistry)
await ctx.plugin(PluginInventoryGateway)

const typert = ctx.get('typert')
check('typert registry mounted', typert !== undefined)
const inventory = ctx.get('pluginInventory')
check('pluginInventory gateway mounted', inventory !== undefined)
check('inventory.list() is async (0.1.5 contract)',
  inventory?.list() instanceof Promise, 'PluginInventorySnapshot is awaited')

// ---------------------------------------------------------------- host mount
const fiber = await ctx.plugin({ name: plugin.name, inject: plugin.inject, apply: plugin.apply })
check('plugin inject declares pluginInventory/loader/typert',
  Array.isArray(plugin.inject) && ['pluginInventory', 'loader', 'typert'].every(k => plugin.inject.includes(k)),
  JSON.stringify(plugin.inject))

const gateway = ctx.get('pluginManager')
check('pluginManager service registered', gateway !== undefined)

// The manual decorator application must still produce markers under the 0.1.5
// prototype-descriptor mechanism (it used to be a WeakMap).
const markers = gateway === undefined ? [] : remoteMethods(gateway)
check('Remote markers present on the service prototype',
  ['list', 'toggle', 'uninstall'].every(m => markers.some(x => x.method === m)),
  JSON.stringify(markers.map(m => m.method)))

// Strict descriptors must reach the shared local registry: the Gateway cannot
// discover child-fiber services through collectSrcClaims().
check('strict descriptor pluginManager/list registered',
  typert?.local.get('pluginManager/list') !== undefined)
check('strict descriptor pluginManager/toggle registered',
  typert?.local.get('pluginManager/toggle') !== undefined)
check('strict descriptor pluginManager/uninstall registered',
  typert?.local.get('pluginManager/uninstall') !== undefined)
check('strict result codec is src-json',
  typert?.local.get('pluginManager/list')?.result.mode === 'src-json',
  JSON.stringify(typert?.local.get('pluginManager/list')?.result))

const record = typert?.getPackage(PACKAGE_NAME, 'host')
check('TypertContribution package face registered', record !== undefined)
check('contribution carries the mandatory model field (0.1.5)',
  record?.model !== undefined && Array.isArray(record.model.services),
  JSON.stringify(record?.model))

// ------------------------------------------------------------ list / toggle
const snapshot = await gateway.list()
check('list() resolves a snapshot (awaited inventory)', snapshot !== undefined && Array.isArray(snapshot.entries))
const names = snapshot.entries.map(e => e.moduleName)
check('list() filters builtin @deepseek-ai/ and cordis: entries',
  !names.some(n => n.startsWith('@deepseek-ai/') || n.startsWith('cordis:')), JSON.stringify(names))
check('list() keeps every user-installed entry', names.length === 3, JSON.stringify(names))
const serper = snapshot.entries.find(e => e.moduleName.includes('serper'))
check('entry shape carries entryId/moduleName/enabled/fiberPhase',
  serper !== undefined && typeof serper.entryId === 'string' && serper.enabled === true && serper.fiberPhase === 'active',
  JSON.stringify(serper))

const serperEntry = byId.get('serper')
await gateway.toggle('serper', false)
check('toggle(false) disables through entry.update({ disabled: true })',
  serperEntry.calls.updates.length === 1 && serperEntry.calls.updates[0].disabled === true,
  JSON.stringify(serperEntry.calls.updates))
await gateway.toggle('serper', true)
check('toggle(true) re-enables through entry.update({ disabled: null })',
  serperEntry.calls.updates.length === 2 && serperEntry.calls.updates[1].disabled === null,
  JSON.stringify(serperEntry.calls.updates))

await gateway.uninstall('serper')
check('uninstall() removes the entry from its parent group',
  serperEntry.calls.removed.length === 1 && serperEntry.calls.removed[0] === 'serper',
  JSON.stringify(serperEntry.calls.removed))

let missingError
try { await gateway.toggle('nope', false) } catch (error) { missingError = error }
check('unknown entry id rejects instead of silently no-oping',
  missingError instanceof Error && /not found/u.test(missingError.message), missingError?.message)

// --------------------------------------------------- lifecycle: reversible
await fiber.dispose()
check('stopping the plugin withdraws its strict descriptors',
  typert?.local.get('pluginManager/list') === undefined)
check('stopping the plugin unregisters the package face',
  typert?.getPackage(PACKAGE_NAME, 'host') === undefined)
check('stopping the plugin releases the service', ctx.get('pluginManager') === undefined)

// Reactivation is what the manager tab itself performs through the Loader
// toggle: a stale package face used to make this throw "already registered".
let restartError
let refiber
try {
  refiber = await ctx.plugin({ name: plugin.name, inject: plugin.inject, apply: plugin.apply })
} catch (error) {
  restartError = error
}
check('reactivating the plugin succeeds (idempotent registration)',
  restartError === undefined && ctx.get('pluginManager') !== undefined, restartError?.message)
check('reactivation re-registers the strict descriptors',
  typert?.local.get('pluginManager/list') !== undefined)
if (refiber !== undefined) await refiber.dispose()

// ------------------------------------------------------------- client half
const clientCalls = { mounts: [] }
const clientCtx = {
  effect: (run) => { run() },
  locale: { register: () => () => {}, bind: () => key => key },
  remote: { $mount: async (contribution) => { clientCalls.mounts.push(contribution); return async () => {} } },
  slots: { inject: () => {}, register: () => ({}) },
  get: () => undefined,
}

const moduledefs = []
globalThis.window = { __ModuleLoader__: { load: def => { moduledefs.push(def) } } }
const clientPath = new URL('./lib/client.js', import.meta.url)
vm.runInThisContext(readFileSync(clientPath, 'utf8'), { filename: clientPath.pathname })
check('client bundle registers itself through window.__ModuleLoader__',
  moduledefs.length === 1 && moduledefs[0].id === PACKAGE_NAME, JSON.stringify(moduledefs.map(d => d.id)))

// The browser module table supplies the shared UI packages; Node cannot load
// that ESM surface here, so the render-only icons are stubbed. Everything the
// protocol check reads (the contribution handed to $mount) is real.
const nodeRequire = createRequire(import.meta.url)
const iconStub = () => null
const clientRequire = id => id === '@deepseek-ai/dsh-client-ui-primitives'
  ? {
    IconSearchOutline16: iconStub,
    IconChevronDownOutline14: iconStub,
    IconChevronUpOutline14: iconStub,
    IconChevronLeftOutline14: iconStub,
    IconChevronRightOutline14: iconStub,
  }
  : nodeRequire(id)

const clientExports = moduledefs[0].factory(clientRequire)
check('client bundle exports the Cordis module face',
  typeof clientExports.apply === 'function' && Array.isArray(clientExports.inject) && typeof clientExports.NS === 'string',
  JSON.stringify({ inject: clientExports.inject, NS: clientExports.NS }))
check('client inject needs slots/locale/remote',
  ['slots', 'locale', 'remote'].every(k => clientExports.inject.includes(k)),
  JSON.stringify(clientExports.inject))

await clientExports.apply(clientCtx)
const contribution = clientCalls.mounts[0]
check('client apply mounts exactly one Typert contribution',
  clientCalls.mounts.length === 1 && contribution?.package === PACKAGE_NAME,
  JSON.stringify(contribution?.package))
check('contribution carries list/toggle/uninstall descriptors',
  contribution !== undefined && contribution.descriptors.length === 3
  && ['list', 'toggle', 'uninstall'].every(m => contribution.descriptors.some(d => d.method === m)),
  JSON.stringify(contribution?.descriptors.map(d => d.method)))

// `$mount` refuses any non-strict codec, so every parameter and result must
// carry a parse()-capable schema.
const RESERVED = new Set(['ctx', 'empty', 'invokeRemote', 'methods', 'name', 'namespace'])
let nonStrict = []
let reserved = []
for (const descriptor of contribution?.descriptors ?? []) {
  if (descriptor.result?.mode !== 'strict' || typeof descriptor.result.schema?.parse !== 'function') {
    nonStrict.push(`${descriptor.method}:result`)
  }
  for (const parameter of descriptor.parameters) {
    if (parameter.codec?.mode !== 'strict' || typeof parameter.codec.schema?.parse !== 'function') {
      nonStrict.push(`${descriptor.method}:${parameter.name}`)
    }
  }
  if (RESERVED.has(descriptor.method)) reserved.push(descriptor.method)
}
check('every client codec is strict with a parse() schema', nonStrict.length === 0, JSON.stringify(nonStrict))
check('no descriptor shadows a Remote namespace service member', reserved.length === 0, JSON.stringify(reserved))

const listResult = contribution.descriptors.find(d => d.method === 'list').result.schema
const parsed = listResult.parse({
  entries: [{ entryId: 'serper', moduleName: 'x', enabled: true, fiberPhase: 'active' }],
})
check('list result schema parses a real inventory snapshot', parsed.entries.length === 1, JSON.stringify(parsed))
const booleanCodec = contribution.descriptors.find(d => d.method === 'toggle')
  .parameters.find(p => p.name === 'enabled').codec
check('toggle enabled codec parses a boolean', booleanCodec.schema.parse(true) === true)
check('toggle enabled codec rejects a non-boolean',
  (() => { try { booleanCodec.schema.parse('yes'); return false } catch { return true } })())

console.log(`\n${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} CHECK(S) FAILED`}`)
for (const failure of failures) console.log(`  - ${failure}`)
process.exit(failures.length === 0 ? 0 : 1)
