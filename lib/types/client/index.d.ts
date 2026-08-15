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
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type MergeToolCallsConfig } from '../types.ts';
import { type MergeToolCallsKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Copy for the merged tool-call rows. */
        'merge-tool-calls': MergeToolCallsKey;
    }
}
/** Required services: the slot registry (toolview shadowing) and locale. */
export declare const inject: string[];
/**
 * Register one shadowed toolview per configured grouped tool.
 * @param ctx - client root context.
 * @param config - row config; defaults apply when the loader passes none.
 */
export declare function apply(ctx: ClientContext, config?: Partial<MergeToolCallsConfig>): void;
