/**
 * Pure card/row derivation from a frozen call slice, mirroring ui-tool's
 * read-card/search-card/tool-call models at the plugin boundary (those models
 * are ui-tool internals and cannot be imported cross-package). Same wire
 * contract, same defensive treatment of untrusted result views.
 * @module
 */
import type { ReadBlockProps, SearchBlockProps } from '@deepseek-ai/dsh-client-ui-primitives';
import type { ToolCallBlock, ToolResultNode } from '@deepseek-ai/dsh-client-runtime/client';
/** Row state semantic, mirroring ui-tool's ToolRowState. */
export type RowState = 'running' | 'ok' | 'error' | 'stopped';
/** Read-card props the ReadBlock primitive draws (per-render maxLines owned by the caller). */
export type ReadCardModel = Pick<ReadBlockProps, 'label' | 'lines' | 'totalLines' | 'lang'>;
/**
 * Distributive `Omit`: a plain `Omit<A | B, K>` keeps only the keys common to
 * both members, dropping the discriminated `files`/`paths` fields. Distributing
 * over the naked type parameter preserves each shape.
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
/** Search-card props plus the capped-result recovery locator (mirrors ui-tool). */
export interface SearchCardModel {
    readonly card: DistributiveOmit<SearchBlockProps, 'maxLines' | 'className'>;
    readonly recovery: string | undefined;
}
/** Everything a merged row needs, derived once from the frozen slice. */
export interface CallRowModel {
    readonly state: RowState;
    /** Expanded-body content card, when the result view declares one. */
    readonly read: ReadCardModel | null;
    readonly search: SearchCardModel | null;
    /** Args-derived one-line summary (path for file tools, query for searches). */
    readonly summary: string;
    /** Openable workspace path from args; absent for non-file tools and errors. */
    readonly filePath: string | undefined;
    /** First result line on an error row (the collapsed summary's error text). */
    readonly errorSummary: string | null;
}
/**
 * Flatten a settled result's content blocks to display text.
 * @param node - settled result node.
 * @returns joined text (may be empty).
 */
export declare function resultText(node: ToolResultNode): string;
/** Strip the workspace root from a workspace-rooted absolute path (display only). */
export declare function relativizeToCwd(text: string, cwd: string | undefined): string;
/** Derive the row model for one call of a grouped tool. */
export declare function callRowModel(toolName: string, block: ToolCallBlock, cwd: string | undefined): CallRowModel;
export {};
