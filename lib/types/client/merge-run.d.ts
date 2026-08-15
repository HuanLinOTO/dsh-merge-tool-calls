/**
 * Pure detection of a consecutive run of grouped tool calls in the chat flow,
 * and the per-seat merged-group partition over it.
 *
 * A pure function of the chat snapshot (order + node store), so the merged
 * display is deterministic under replay: the web layer recomputes it per frame.
 * @module
 */
import type { ChatNodeStore, ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client';
import type { MergeGroupMode } from '../types.ts';
/** The wire tool name of a call in either lifecycle form (mirrors ui-tool). */
export declare function callNameOf(block: ToolCallBlock): string;
/** Whether the call's wire name is one of the grouped tools. */
export declare function isGroupedTool(name: string, tools: readonly string[]): boolean;
/** One merged group: the group's first call plus its consecutive continuations. */
export interface ReadRun {
    /** Whether this seat is the group's rendering head (the only seat that shows the card). */
    readonly isFirst: boolean;
    /** The group's root blocks in flow order (first + continuations). */
    readonly blocks: readonly ToolCallBlock[];
}
/**
 * Compute the merged group this call belongs to.
 *
 * 1. Locates this call's node in the chat order; null when it is not a chat
 *    tool-call node (e.g. a read dispatched as a subcall).
 * 2. Walks backward/forward to the maximal consecutive run of grouped tool
 *    calls containing it (`adjacent`: any consecutive run; `step`: same agent
 *    step as this call).
 * 3. Partitions the run into `maxGroupSize`-sized groups; this call is the
 *    group's first only when it heads one of those partitions. Truncation
 *    therefore never orphans a call: the excess starts its own group.
 *
 * @param order - chat node key order.
 * @param nodes - chat node store.
 * @param myCallId - the call id of the seat asking about itself.
 * @param tools - grouped wire tool names.
 * @param groupBy - grouping mode.
 * @param maxGroupSize - per-group cap.
 * @returns the group partition, or null when the call is not a chat tool-call node.
 */
export declare function readRun(order: readonly string[], nodes: ChatNodeStore, myCallId: string, tools: readonly string[], groupBy: MergeGroupMode, maxGroupSize: number): ReadRun | null;
