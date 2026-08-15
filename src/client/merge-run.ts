/**
 * Pure detection of a consecutive run of grouped tool calls in the chat flow,
 * and the per-seat merged-group partition over it.
 *
 * A pure function of the chat snapshot (order + node store), so the merged
 * display is deterministic under replay: the web layer recomputes it per frame.
 * @module
 */
import type { ChatConversationViewNode, ChatNodeStore, ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import { conversationContextKey } from '@deepseek-ai/dsh-client-runtime/client'
import type { MergeGroupMode } from '../types.ts'
import { classifyTool } from './tool-names.ts'

/** Tool-call node kind registered by ui-conversation's built-in tool definition. */
const TOOL_CALL_KIND = 'tool-call'

/** Extract a root call block from any chat node, when it is a tool-call node. */
function toolRootOf(node: ChatConversationViewNode): ToolCallBlock | null {
  if (node.kind !== TOOL_CALL_KIND) return null
  const root = (node.data as { root?: unknown }).root
  return typeof root === 'object' && root !== null ? root as ToolCallBlock : null
}

/** The wire tool name of a call in either lifecycle form (mirrors ui-tool). */
export function callNameOf(block: ToolCallBlock): string {
  return 'kind' in block ? (block.call?.name ?? '') : block.name
}

/** Whether the call's wire name is one of the grouped tools (empty = all). */
export function isGroupedTool(name: string, tools: readonly string[]): boolean {
  return tools.length === 0 || tools.includes(name)
}

/** Step identity of a node's location; undefined when the node is not step-bound. */
function stepIdOf(node: ChatConversationViewNode): string | undefined {
  const location = node.location
  return location.kind === 'step' ? `${location.turn.turn}:${location.step.step}` : undefined
}

/** One merged group: the group's first call plus its consecutive continuations. */
export interface ReadRun {
  /** Whether this seat is the group's rendering head (the only seat that shows the card). */
  readonly isFirst: boolean
  /** The group's root blocks in flow order (first + continuations). */
  readonly blocks: readonly ToolCallBlock[]
}

/**
 * Compute the merged group this call belongs to.
 *
 * 1. Locates this call's node in the chat order; null when it is not a chat
 *    tool-call node (e.g. a read dispatched as a subcall).
 * 2. Walks backward/forward to the maximal consecutive run containing it. A
 *    call continues the run when it is a grouped tool AND same-tool-same-run:
 *    the identical wire name, or a sibling of the same known variant family
 *    (grep+glob, bash+pwsh, read+web_fetch…). Unknown names (variant
 *    `others`) only merge with themselves, so unrelated tools never share a
 *    card (`adjacent`: any consecutive run; `step`: same agent step as this
 *    call).
 * 3. Partitions the run into `maxGroupSize`-sized groups; this call is the
 *    group's first only when it heads one of those partitions. Truncation
 *    therefore never orphans a call: the excess starts its own group.
 *
 * @param order - chat node key order.
 * @param nodes - chat node store.
 * @param myCallId - the call id of the seat asking about itself.
 * @param tools - grouped wire tool names; empty means every tool.
 * @param groupBy - grouping mode.
 * @param maxGroupSize - per-group cap.
 * @returns the group partition, or null when the call is not a chat tool-call node.
 */
export function readRun(
  order: readonly string[],
  nodes: ChatNodeStore,
  myCallId: string,
  tools: readonly string[],
  groupBy: MergeGroupMode,
  maxGroupSize: number,
): ReadRun | null {
  const myKey = conversationContextKey(TOOL_CALL_KIND, myCallId)
  const myIndex = order.indexOf(myKey)
  if (myIndex < 0) return null
  const myRoot = rootAtNode(order, nodes, myIndex)
  if (myRoot === null) return null
  const myName = callNameOf(myRoot)
  const myVariant = classifyTool(myName)
  const size = Math.max(1, maxGroupSize)

  const rootAt = (index: number): ToolCallBlock | null => rootAtNode(order, nodes, index)
  const myStep = groupBy === 'step' ? stepIdOfNodeAt(order, nodes, myIndex) : undefined
  const inGroup = (index: number): boolean => {
    const root = rootAt(index)
    if (root === null || !isGroupedTool(callNameOf(root), tools)) return false
    const name = callNameOf(root)
    // Same-name calls always continue the run; known families merge siblings
    // (grep+glob, bash+pwsh); unknown names merge only with themselves.
    if (name !== myName) {
      if (myVariant === 'others' || classifyTool(name) !== myVariant) return false
    }
    if (groupBy !== 'step') return true
    return myStep !== undefined && stepIdOfNodeAt(order, nodes, index) === myStep
  }

  let start = myIndex
  while (start > 0 && inGroup(start - 1)) start--
  let end = myIndex
  while (end < order.length - 1 && inGroup(end + 1)) end++

  const groupStart = start + Math.floor((myIndex - start) / size) * size
  const groupEnd = Math.min(groupStart + size, end + 1)

  const blocks: ToolCallBlock[] = []
  for (let index = groupStart; index < groupEnd; index++) {
    const root = rootAt(index)
    if (root !== null) blocks.push(root)
  }
  return { isFirst: myIndex === groupStart, blocks }
}

function rootAtNode(order: readonly string[], nodes: ChatNodeStore, index: number): ToolCallBlock | null {
  const key = order[index]
  const node = key === undefined ? undefined : nodes.get(key)
  return node === undefined ? null : toolRootOf(node)
}

function stepIdOfNodeAt(order: readonly string[], nodes: ChatNodeStore, index: number): string | undefined {
  const key = order[index]
  const node = key === undefined ? undefined : nodes.get(key)
  return node === undefined ? undefined : stepIdOf(node)
}
