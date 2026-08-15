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
import z from '@deepseek-ai/schemastery';
import type { MergeToolCallsConfig } from './types.ts';
export declare const name = "merge-tool-calls";
export type { MergeToolCallsConfig } from './types.ts';
/** Validated output shape of {@link Config} (defaults applied). */
export interface Config extends MergeToolCallsConfig {
}
/** Schemastery schema: validated Config fields with the row's runtime defaults. */
export declare const Config: z<Config>;
/**
 * Empty host apply: all registrations live in the browser half.
 * @param _ctx - cordis context (unused; the plugin contributes client slots only).
 */
export declare function apply(_ctx: unknown): void;
