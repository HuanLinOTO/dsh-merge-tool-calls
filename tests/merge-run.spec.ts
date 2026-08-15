/** Unit tests for the consecutive-run detection (`merge-run.ts`). */
import { describe, expect, it, vi } from 'vitest'
import type { ChatConversationViewNode, ChatNodeStore, ConversationLocation, ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import { callNameOf, isGroupedTool, readRun } from '../src/client/merge-run.ts'

// The only runtime value merge-run imports is the public node-key contract
// function; supply it so the spec needs no dsh runtime package.
vi.mock('@deepseek-ai/dsh-client-runtime/client', () => ({
  conversationContextKey: (kind: string, id: string) => `${kind.length}:${kind}${id}`,
}))

const TOOLS = ['read', 'grep', 'glob']

function location(turn: number, step: number | undefined): ConversationLocation {
  return step === undefined
    ? { kind: 'turn', turn: { turn, start: undefined, end: undefined, status: 'closed', steps: [], data: { get: () => undefined } } }
    : {
      kind: 'step',
      turn: { turn, start: undefined, end: undefined, status: 'closed', steps: [], data: { get: () => undefined } },
      step: { turn, step, start: undefined, end: undefined, status: 'closed', data: { get: () => undefined } },
    }
}

function runningCall(callId: string, name: string): ToolCallBlock {
  return { callId, name, argsRaw: '{}', turn: 1, step: 1, time: 0, callView: null, subCalls: [] }
}

function node(key: string, callId: string, name: string, loc: ConversationLocation): ChatConversationViewNode {
  return {
    key,
    kind: 'tool-call',
    id: callId,
    target: 'chat',
    anchorSeq: 0,
    location: loc,
    visibility: 'visible',
    data: { root: runningCall(callId, name) },
  }
}

const KEY = (id: string) => `9:tool-call${id}`

function makeStore(...nodes: ChatConversationViewNode[]): ChatNodeStore {
  const map = new Map(nodes.map(node => [node.key, node]))
  return { get: key => map.get(key), values: () => [...map.values()] }
}

function keys(...ids: string[]): string[] {
  return ids.map(KEY)
}

describe('readRun', () => {
  it('groups a consecutive run and marks only its first call as the head', () => {
    const store = makeStore(node(KEY('a'), 'a', 'read', location(1, 1)), node(KEY('b'), 'b', 'read', location(1, 1)), node(KEY('c'), 'c', 'read', location(1, 1)))
    const order = keys('a', 'b', 'c')
    const first = readRun(order, store, 'a', TOOLS, 'adjacent', 8)
    expect(first).not.toBeNull()
    expect(first!.isFirst).toBe(true)
    expect(first!.blocks.map(callNameOf)).toEqual(['read', 'read', 'read'])
    expect(first!.blocks.map(block => block.callId)).toEqual(['a', 'b', 'c'])

    const middle = readRun(order, store, 'b', TOOLS, 'adjacent', 8)
    expect(middle!.isFirst).toBe(false)
    expect(middle!.blocks.map(block => block.callId)).toEqual(['a', 'b', 'c'])

    const last = readRun(order, store, 'c', TOOLS, 'adjacent', 8)
    expect(last!.isFirst).toBe(false)
  })

  it('breaks the run at a non-grouped node and a non-tool node', () => {
    const store = makeStore(
      node(KEY('a'), 'a', 'read', location(1, 1)),
      node(KEY('todo'), 'todo', 'todo_write', location(1, 1)),
      node(KEY('b'), 'b', 'read', location(1, 1)),
    )
    const order = keys('a', 'todo', 'b')
    expect(readRun(order, store, 'a', TOOLS, 'adjacent', 8)!.blocks.map(block => block.callId)).toEqual(['a'])
    expect(readRun(order, store, 'b', TOOLS, 'adjacent', 8)!.blocks.map(block => block.callId)).toEqual(['b'])
    expect(readRun(order, store, 'b', TOOLS, 'adjacent', 8)!.isFirst).toBe(true)
  })

  it('merges grep and glob together and ignores other tools', () => {
    const store = makeStore(
      node(KEY('g1'), 'g1', 'grep', location(1, 1)),
      node(KEY('g2'), 'g2', 'glob', location(1, 1)),
      node(KEY('w'), 'w', 'web_search', location(1, 1)),
    )
    const order = keys('g1', 'g2', 'w')
    expect(readRun(order, store, 'g1', TOOLS, 'adjacent', 8)!.blocks.map(block => block.callId)).toEqual(['g1', 'g2'])
    expect(readRun(order, store, 'w', ['web_search'], 'adjacent', 8)!.blocks.map(block => block.callId)).toEqual(['w'])
  })

  it('step mode only merges calls of the same agent step', () => {
    const store = makeStore(
      node(KEY('a'), 'a', 'read', location(1, 1)),
      node(KEY('b'), 'b', 'read', location(1, 2)),
      node(KEY('c'), 'c', 'read', location(1, 2)),
    )
    const order = keys('a', 'b', 'c')
    expect(readRun(order, store, 'a', TOOLS, 'step', 8)!.blocks.map(block => block.callId)).toEqual(['a'])
    expect(readRun(order, store, 'b', TOOLS, 'step', 8)!.blocks.map(block => block.callId)).toEqual(['b', 'c'])
    expect(readRun(order, store, 'b', TOOLS, 'step', 8)!.isFirst).toBe(true)
    expect(readRun(order, store, 'c', TOOLS, 'step', 8)!.isFirst).toBe(false)
  })

  it('partitions a run longer than maxGroupSize without orphaning any call', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    const store = makeStore(...ids.map((id, index) => node(KEY(id), id, 'read', location(1, index))))
    const order = keys(...ids)
    const run = readRun(order, store, 'a', TOOLS, 'adjacent', 3)
    expect(run!.isFirst).toBe(true)
    expect(run!.blocks.map(block => block.callId)).toEqual(['a', 'b', 'c'])
    // The fourth call heads the next truncated group (never orphaned).
    const next = readRun(order, store, 'd', TOOLS, 'adjacent', 3)
    expect(next!.isFirst).toBe(true)
    expect(next!.blocks.map(block => block.callId)).toEqual(['d', 'e'])
    // Continuation calls inside either group are not heads.
    expect(readRun(order, store, 'b', TOOLS, 'adjacent', 3)!.isFirst).toBe(false)
    expect(readRun(order, store, 'e', TOOLS, 'adjacent', 3)!.isFirst).toBe(false)
  })

  it('returns null when the call is not a chat tool-call node', () => {
    const store = makeStore(node(KEY('a'), 'a', 'read', location(1, 1)))
    expect(readRun(keys('a'), store, 'missing', TOOLS, 'adjacent', 8)).toBeNull()
  })

  it('exposes callNameOf for both lifecycle forms', () => {
    expect(callNameOf(runningCall('x', 'read'))).toBe('read')
    expect(callNameOf({ kind: 'tool-result', seq: 1, time: 0, callId: 'x', call: { name: 'grep', argsRaw: '{}' }, callTime: 0, content: [], isError: false, callView: null, resultView: null, subCalls: [] })).toBe('grep')
    expect(isGroupedTool('read', TOOLS)).toBe(true)
    expect(isGroupedTool('web_search', TOOLS)).toBe(false)
  })
})
