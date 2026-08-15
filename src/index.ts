/**
 * merge-tool-calls — host entry.
 *
 * The plugin is browser-only: it shadows the shipped `read`/`grep`/`glob`
 * toolviews inside `tool.call.toolview` (see `src/client/`). The host half
 * exists to declare the validated Config schema for the bundle row; its apply
 * is intentionally empty.
 *
 * @module @huanlin/dsh-plugin-merge-tool-calls
 */

import z from '@deepseek-ai/schemastery'
import type { MergeToolCallsConfig } from './types.ts'

export const name = 'merge-tool-calls'

export type { MergeToolCallsConfig } from './types.ts'

/** Validated output shape of {@link Config} (defaults applied). */
export interface Config extends MergeToolCallsConfig {}

/** Schemastery schema: validated Config fields with the row's runtime defaults. */
export const Config = z.object({
  tools: z.array(z.string()).default(['read', 'grep', 'glob'])
    .description('Wire tool names whose consecutive calls merge into one card.'),
  groupBy: z.union(['adjacent', 'step']).default('adjacent')
    .description('adjacent merges any consecutive run in the chat flow; step merges only calls within one agent step.'),
  maxGroupSize: z.natural().default(8)
    .description('Maximum calls per merged group; excess calls start a new group.'),
}) as unknown as z<Config>

/**
 * Empty host apply: all registrations live in the browser half.
 * @param _ctx - cordis context (unused; the plugin contributes client slots only).
 */
export function apply(_ctx: unknown): void {
  // No host-side behavior: this package only shadows toolview slots in the web
  // GUI. Keeping an explicit empty apply documents the client-only intent.
}
