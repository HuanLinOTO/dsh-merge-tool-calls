import type { ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client';
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { MergeToolCallsConfig } from '../types.ts';
/** Locale seat and inject face of the merged row registration. */
export type MergedToolRowProps = ToolCallViewProps & PropsLocale<'merge-tool-calls'> & {
    readonly cfg: MergeToolCallsConfig;
};
/** The run's main card: the first call's full row (chrome + expandable card). */
export declare const RowCard: import("react").NamedExoticComponent<{
    toolName: string;
    block: ToolCallBlock;
    cwd: string | undefined;
    openFile: (path: string) => void;
    inspect: (() => void) | undefined;
    t: MergedToolRowProps["t"];
    /** Continuation-call count rendered as a muted `+n` suffix; 0 hides it. */
    mergedCount: number;
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
