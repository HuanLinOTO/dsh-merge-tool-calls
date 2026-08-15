/**
 * merge-tool-calls — browser half.
 *
 * Shadows the shipped `tool.call.toolview` entries for every configured tool
 * (default read/grep/glob) at priority -1 (the keyed slot's shadowing rule:
 * lowest priority renders). The shadowed component merges consecutive calls of
 * one tool in the chat flow into a single card with compact child rows.
 *
 * @module @dsh-external/dsh-merge-tool-calls/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { DEFAULT_MERGE_CONFIG, type MergeToolCallsConfig } from '../types.ts'
import { en, NS, zh, type MergeToolCallsKey } from './locales.ts'
import { MergedToolRow } from './rows.tsx'
import { installStyles } from './styles.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Copy for the merged tool-call rows. */
    'merge-tool-calls': MergeToolCallsKey
  }
}

/** Required services: the slot registry (toolview shadowing) and locale. */
export const inject = ['slots', 'locale']

/**
 * Register one shadowed toolview per configured grouped tool.
 * @param ctx - client root context.
 * @param config - row config; defaults apply when the loader passes none.
 */
export function apply(ctx: ClientContext, config: Partial<MergeToolCallsConfig> = {}): void {
  const cfg: MergeToolCallsConfig = { ...DEFAULT_MERGE_CONFIG, ...config }
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'merge-tool-calls: dictionaries')
  ctx.effect(installStyles, 'merge-tool-calls: styles')

  for (const tool of cfg.tools) {
    ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
      name: 'tool.call.toolview',
      key: tool,
      priority: -1,
      locale: NS,
      inject: () => ({ cfg }),
    }, MergedToolRow))
  }
}
