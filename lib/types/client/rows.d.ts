/**
 * Merged tool-call row — the shadowed `tool.call.toolview` registrant.
 *
 * For the first call of a consecutive run of grouped tools, renders the run as
 * one card (the first call's full row) plus one compact child row per
 * continuation call. For a continuation call, renders nothing: the seat stays
 * empty and the injected stylesheet collapses it out of the flow. When the
 * call is not a chat tool-call node at all (e.g. dispatched as a subcall),
 * falls back to a plain single row so the call never disappears.
 *
 * The row surface mirrors the built-in generic ToolRow: a variant title/icon
 * plus the settled card (read/search/diff/terminal/web) or IN/OUT text.
 *
 * Everything here is a pure function of the chat snapshot + the frozen call
 * slices (replay-deterministic); expand state is component-local view state.
 * @module
 */
import { type ReactNode } from 'react';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client';
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { MergeToolCallsConfig } from '../types.ts';
/** Locale seat and inject face of the merged row registration. */
export type MergedToolRowProps = ToolCallViewProps & PropsLocale<'merge-tool-calls'> & {
    readonly cfg: MergeToolCallsConfig;
};
/**
 * The run's main card: the first call's chrome (variant title/icon + state)
 * plus, for a single call, its expandable content card. For a merged run the
 * main row's collapsed summary is the count (`Read · 5 Files`) and the
 * expanded body is the child-rows block (passed in as `children`); the first
 * call is rendered as the first child row so every file path lands on a child
 * row, never on the main row.
 */
export declare const RowCard: import("react").NamedExoticComponent<{
    toolName: string;
    block: ToolCallBlock;
    cwd: string | undefined;
    openFile: (path: string) => void;
    inspect: (() => void) | undefined;
    t: MergedToolRowProps["t"];
    /** Continuation-call count; 0 means a single-call row (no child rows). */
    mergedCount: number;
    /** Child rows for the merged run (all calls, including the first). */
    children?: ReactNode;
}>;
/**
 * One compact continuation row: the main row's tail structure ([sep dot][path]).
 * An expandable call toggles the inline content card on click (mirroring the
 * main row's whole-row disclosure); a read/write/edit-family path additionally
 * renders as an open-file link (the sidebar preview) that stops propagation,
 * exactly like the main row's summary link.
 */
export declare const ChildRow: import("react").NamedExoticComponent<{
    toolName: string;
    block: ToolCallBlock;
    cwd: string | undefined;
    openFile: (path: string) => void;
    t: MergedToolRowProps["t"];
}>;
/**
 * The shadowed toolview: renders the merged run card for the run's first call,
 * nothing for continuation calls, and a plain single row when this call is not
 * a chat tool-call node.
 *
 * Child-row alignment is measured at runtime, not hardcoded: the main row's
 * separator dot sits after a variable-width title ("Read"/"Search"/"Bash"/…),
 * so its column depends on the rendered font. A layout effect measures the
 * dot's offset from the card root (once, plus on reflow via ResizeObserver)
 * and indents the children so their dots and paths land on the main row's
 * columns — no font/title constants to keep in sync.
 */
export declare function MergedToolRow({ callId, toolName, block, cwd, openFile, inspect, t, cfg, useSession }: MergedToolRowProps): import("react").JSX.Element | null;
