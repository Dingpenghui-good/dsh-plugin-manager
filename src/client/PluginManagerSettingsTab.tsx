import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import type { PluginInventoryEntry } from '@deepseek-ai/dsh-host-plugin-inventory/types'
import {
  IconChevronDownOutline14,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './PluginManagerSettingsTab.module.css'

/** Registration-side Remote face used by the section. */
export interface PluginManagerSettingsTabInjected {
  /** Read a current Host plugin manager snapshot (user-installed entries only). */
  list: () => Promise<{ entries: readonly PluginInventoryEntry[] }>
  /** Toggle the enabled state of one plugin entry. */
  toggle: (entryId: string, enabled: boolean) => Promise<void>
  /** Permanently remove one plugin entry from the loader tree. */
  uninstall: (entryId: string) => Promise<void>
}

/** Full component props assembled by the Settings slot renderer. */
export type PluginManagerSettingsTabProps =
  PropsRuntime<'settings.plugins.tab'>
  & PropsLocale<'settings.pluginManager'>
  & InjectFace<PluginManagerSettingsTabInjected>

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly entries: readonly PluginInventoryEntry[] }

/** Localized accessible label for one root Fiber phase. */
function phaseLabel(
  phase: PluginInventoryEntry['fiberPhase'],
  t: PluginManagerSettingsTabProps['t'],
): string {
  return phase === null ? t('unobserved') : t((PHASE_KEYS[phase as keyof typeof PHASE_KEYS] ?? 'active') as Parameters<typeof t>[0])
}

/** Compact a module specifier for display. */
function moduleShortName(moduleName: string): string {
  const unscoped = moduleName.startsWith('@') ? moduleName.slice(moduleName.indexOf('/') + 1) : moduleName
  return unscoped
    .replace(/^cordis:/, '')
    .replace(/^cordis-plugin-/, '')
    .replace(/^dsh-(?:host-|client-)?/, '')
}

const PHASE_KEYS = {
  pending: 'pending',
  loading: 'loadingPhase',
  active: 'active',
  failed: 'failed',
  unloading: 'unloading',
} satisfies Record<Exclude<PluginInventoryEntry['fiberPhase'], null>, string>

/** Whether a plugin entry matches the local catalog query. */
function matches(entry: PluginInventoryEntry, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) return true
  return [entry.moduleName, entry.entryId]
    .some(value => value.toLocaleLowerCase().includes(normalizedQuery))
}

/** Render the writable plugin manager. */
export function PluginManagerSettingsTab({
  list, toggle, uninstall, t,
}: PluginManagerSettingsTabProps): ReactNode {
  const catalogId = useId()
  const [request, setRequest] = useState(0)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<PluginInventoryEntry['entryId'] | null>(null)
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [busy, setBusy] = useState<ReadonlyMap<string, 'toggling' | 'uninstalling'>>(new Map())

  useEffect(() => {
    let current = true
    void Promise.resolve().then(() => list()).then(
      (snapshot) => { if (current) setState({ status: 'ready', entries: snapshot.entries }) },
      () => { if (current) setState({ status: 'error' }) },
    )
    return () => { current = false }
  }, [list, request])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredEntries = useMemo(
    () => state.status === 'ready'
      ? state.entries.filter(entry => matches(entry, normalizedQuery))
      : [],
    [normalizedQuery, state],
  )

  useEffect(() => {
    if (expanded !== null && !filteredEntries.some(entry => entry.entryId === expanded)) {
      setExpanded(null)
    }
  }, [expanded, filteredEntries])

  const retry = (): void => {
    setState({ status: 'loading' })
    setRequest(value => value + 1)
  }

  const setBusyKey = (entryId: string, kind: 'toggling' | 'uninstalling'): void => {
    setBusy(previous => {
      const next = new Map(previous)
      next.set(entryId, kind)
      return next
    })
  }

  const clearBusy = (entryId: string): void => {
    setBusy(previous => {
      const next = new Map(previous)
      next.delete(entryId)
      return next
    })
  }

  const handleToggle = async (entry: PluginInventoryEntry): Promise<void> => {
    setBusyKey(entry.entryId, 'toggling')
    try {
      await toggle(entry.entryId, !entry.enabled)
      void Promise.resolve().then(() => list()).then(
        snapshot => setState({ status: 'ready', entries: snapshot.entries }),
        () => setState({ status: 'error' }),
      )
    } finally {
      clearBusy(entry.entryId)
    }
  }

  const handleUninstall = async (entry: PluginInventoryEntry): Promise<void> => {
    const message = t('confirmUninstall').replace('%s', moduleShortName(entry.moduleName))
    const ok = window.confirm(message)
    if (!ok) return
    setBusyKey(entry.entryId, 'uninstalling')
    try {
      await uninstall(entry.entryId)
      void Promise.resolve().then(() => list()).then(
        snapshot => setState({ status: 'ready', entries: snapshot.entries }),
        () => setState({ status: 'error' }),
      )
    } finally {
      clearBusy(entry.entryId)
    }
  }

  return (
    <div className={css.section} aria-busy={state.status === 'loading'}>
      {state.status === 'loading' ? <p className={css.status}>{t('loading')}</p> : null}
      {state.status === 'error' ? (
        <div className={css.failure}>
          <p role="alert">{t('error')}</p>
          <button type="button" onClick={retry}>{t('retry')}</button>
        </div>
      ) : null}
      {state.status === 'ready' ? (
        <div className={css.catalog}>
          <label className={css.search}>
            <IconSearchOutline16 aria-hidden="true" />
            <span className={css.visuallyHidden}>{t('search')}</span>
            <input
              type="search"
              value={query}
              placeholder={t('search')}
              aria-label={t('search')}
              onChange={(event) => { setQuery(event.currentTarget.value) }}
            />
          </label>
          <div className={css.catalogHeading}>
            <h3>{t('catalog')}</h3>
            <span data-plugin-count={filteredEntries.length}>{filteredEntries.length}</span>
          </div>
          {state.entries.length === 0 ? <p className={css.status}>{t('empty')}</p> : null}
          {state.entries.length > 0 && filteredEntries.length === 0
            ? <p className={css.status}>{t('emptySearch')}</p>
            : null}
          {filteredEntries.length > 0 ? (
            <ul className={css.cards}>
              {filteredEntries.map((entry) => {
                const status = phaseLabel(entry.fiberPhase, t)
                const title = moduleShortName(entry.moduleName)
                const configuration = t(entry.enabled ? 'enabledTag' : 'disabledTag')
                const open = expanded === entry.entryId
                const isToggling = busy.get(entry.entryId) === 'toggling'
                const isUninstalling = busy.get(entry.entryId) === 'uninstalling'
                const detailId = `${catalogId}-details-${encodeURIComponent(entry.entryId)}`
                return (
                  <li
                    className={css.card}
                    key={entry.entryId}
                    data-plugin-entry={entry.entryId}
                    data-open={open ? 'true' : undefined}
                  >
                    <button
                      className={css.cardContent}
                      type="button"
                      aria-expanded={open}
                      aria-controls={detailId}
                      aria-label={entry.enabled ? `${title}, ${status}, ${configuration}` : `${title}, ${configuration}`}
                      onClick={() => {
                        setExpanded(current => current === entry.entryId ? null : entry.entryId)
                      }}
                    >
                      <strong className={css.cardTitle} title={entry.moduleName}>{title}</strong>
                      <span className={css.cardTrailing}>
                        {entry.enabled ? (
                          <span
                            className={css.statusDot}
                            data-phase={entry.fiberPhase ?? 'unobserved'}
                            role="img"
                            aria-label={status}
                            title={status}
                          />
                        ) : null}
                        <span className={css.configTag} data-enabled={entry.enabled ? 'true' : 'false'}>
                          {configuration}
                        </span>
                        <IconChevronDownOutline14 className={css.chevron} size={12} aria-hidden="true" />
                      </span>
                    </button>
                    {open ? (
                      <div className={css.cardDetails} id={detailId}>
                        <code className={css.entryValue} data-loader-entry>{entry.entryId}</code>
                        <dl className={css.details}>
                          <div>
                            <dt>{t('configuration')}</dt>
                            <dd>{configuration}</dd>
                          </div>
                          {entry.enabled ? (
                            <div>
                              <dt>{t('cordis')}</dt>
                              <dd>{status}</dd>
                            </div>
                          ) : null}
                        </dl>
                        <div className={css.cardActions}>
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleToggle(entry)
                            }}
                            aria-label={entry.enabled ? t('disable') : t('enable')}
                          >
                            {isToggling ? t('toggling') : entry.enabled ? t('disable') : t('enable')}
                          </button>
                          <button
                            type="button"
                            className={css.danger}
                            disabled={isUninstalling}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleUninstall(entry)
                            }}
                            aria-label={t('uninstall')}
                          >
                            {isUninstalling ? t('uninstalling') : t('uninstall')}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
