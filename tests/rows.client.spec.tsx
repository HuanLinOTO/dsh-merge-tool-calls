// @vitest-environment jsdom
/** Component spec: MergedToolRow renders the run card / hides continuations. */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { ConversationSnapshot, ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import { MergedToolRow, type MergedToolRowProps } from '../src/client/rows.tsx'
import type { MergeToolCallsConfig } from '../src/types.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const CFG: MergeToolCallsConfig = { tools: ['read', 'grep', 'glob'], groupBy: 'adjacent', maxGroupSize: 8 }

const T = ((key: string, params?: Record<string, unknown>) => {
  const dict: Record<string, string> = {
    running: 'Running', failed: 'Failed', stopped: 'Interrupted',
    expand: 'Expand', collapse: 'Collapse', more: '+{n}',
  }
  const raw = dict[key] ?? key
  return params === undefined ? raw : raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]))
}) as MergedToolRowProps['t']

function runningCall(callId: string, name: string, argsRaw = '{}'): ToolCallBlock {
  return { callId, name, argsRaw, turn: 1, step: 1, time: 0, callView: null, subCalls: [] }
}

function settledRead(callId: string, path: string): ToolCallBlock {
  return {
    kind: 'tool-result', seq: 1, time: 0, callId,
    call: { name: 'read', argsRaw: JSON.stringify({ file_path: path }) },
    callTime: 0, content: [], isError: false, callView: null,
    resultView: { card: 'read', path, offset: 1, lines: [{ number: 1, text: 'hello' }], totalLines: 1 },
    subCalls: [],
  }
}

function settledWrite(callId: string, path: string): ToolCallBlock {
  return {
    kind: 'tool-result', seq: 1, time: 0, callId,
    call: { name: 'write', argsRaw: JSON.stringify({ file_path: path }) },
    callTime: 0, content: [], isError: false, callView: null, resultView: null,
    subCalls: [],
  }
}

const NODE_KEY = (id: string) => `9:tool-call${id}`

function snapshotOf(ids: string[], byId: Record<string, { callId: string; block: ToolCallBlock }>): ConversationSnapshot {
  const order = ids.map(NODE_KEY)
  const nodes = new Map<string, unknown>()
  for (const [key, entry] of Object.entries(byId)) {
    nodes.set(NODE_KEY(entry.callId), {
      key: NODE_KEY(entry.callId), kind: 'tool-call', id: entry.callId, target: 'chat', anchorSeq: 0,
      location: {
        kind: 'step',
        turn: { turn: 1, start: undefined, end: undefined, status: 'closed', steps: [], data: { get: () => undefined } },
        step: { turn: 1, step: 1, start: undefined, end: undefined, status: 'closed', data: { get: () => undefined } },
      },
      visibility: 'visible', data: { root: entry.block },
    })
  }
  return {
    chat: {
      order,
      nodes: { get: nodeKey => nodes.get(nodeKey) as never, values: () => [...nodes.values()] as never },
      locations: undefined as never,
      timeline: { turnOrder: [], turns: new Map() },
      legacy: undefined as never,
    },
  } as ConversationSnapshot
}

function render(partial: Partial<MergedToolRowProps> & { callId: string; useSession: MergedToolRowProps['useSession'] }) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<MergedToolRow
      toolName="read"
      block={runningCall(partial.callId, 'read')}
      cwd={undefined}
      openFile={() => {}}
      inspect={undefined}
      t={T}
      cfg={CFG}
      {...partial}
    />)
  })
  return { container, root }
}

function unmount(root: Root) {
  act(() => { root.unmount() })
  document.body.innerHTML = ''
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('MergedToolRow', () => {
  it('renders the run card for the first call, with one child row per continuation', () => {
    const snapshot = snapshotOf(['a', 'b', 'c'], {
      a: { callId: 'a', block: settledRead('a', 'foo.ts') },
      b: { callId: 'b', block: settledRead('b', 'bar.ts') },
      c: { callId: 'c', block: settledRead('c', 'baz.ts') },
    })
    const useSession = ((selector: (s: ConversationSnapshot) => unknown) => selector(snapshot)) as MergedToolRowProps['useSession']
    const { container, root } = render({ callId: 'a', useSession })
    expect(container.querySelector('[data-testid="disclosure"]')).not.toBeNull()
    expect(container.textContent).toContain('Read')
    expect(container.textContent).toContain('foo.ts')
    // Two continuation child rows.
    const toggles = container.querySelectorAll('.mtc-child-row')
    expect(toggles.length).toBe(2)
    expect(toggles[0]!.textContent).toContain('bar.ts')
    expect(toggles[1]!.textContent).toContain('baz.ts')
    // Merged-count suffix.
    expect(container.textContent).toContain('+2')
    unmount(root)
  })

  it('renders nothing for a continuation call (seat stays empty)', () => {
    const snapshot = snapshotOf(['a', 'b'], {
      a: { callId: 'a', block: settledRead('a', 'foo.ts') },
      b: { callId: 'b', block: settledRead('b', 'bar.ts') },
    })
    const useSession = ((selector: (s: ConversationSnapshot) => unknown) => selector(snapshot)) as MergedToolRowProps['useSession']
    const { container, root } = render({ callId: 'b', useSession })
    expect(container.children.length).toBe(0)
    unmount(root)
  })

  it('expands a child row to reveal its file content on click', () => {
    const snapshot = snapshotOf(['a', 'b'], {
      a: { callId: 'a', block: settledRead('a', 'foo.ts') },
      b: { callId: 'b', block: settledRead('b', 'bar.ts') },
    })
    const useSession = ((selector: (s: ConversationSnapshot) => unknown) => selector(snapshot)) as MergedToolRowProps['useSession']
    const { container, root } = render({ callId: 'a', useSession })
    expect(container.querySelectorAll('[data-testid="readblock"]').length).toBe(0) // collapsed
    const row = container.querySelector('.mtc-child-row') as HTMLDivElement
    act(() => { row.click() })
    const blocks = container.querySelectorAll('[data-testid="readblock"]')
    expect(blocks.length).toBe(1) // the child's card body; the main row stays collapsed
    expect(blocks[0]!.textContent).toContain('bar.ts')
    unmount(root)
  })

  it('renders a read child path as an open-file link (sidebar preview)', () => {
    const snapshot = snapshotOf(['a', 'b'], {
      a: { callId: 'a', block: settledRead('a', 'foo.ts') },
      b: { callId: 'b', block: settledRead('b', 'bar.ts') },
    })
    const useSession = ((selector: (s: ConversationSnapshot) => unknown) => selector(snapshot)) as MergedToolRowProps['useSession']
    const opened: string[] = []
    const { container, root } = render({
      callId: 'a',
      useSession,
      openFile: (path: string) => { opened.push(path) },
    })
    const link = container.querySelector('.mtc-child-path-link') as HTMLButtonElement
    expect(link).not.toBeNull()
    act(() => { link.click() })
    expect(opened).toEqual(['bar.ts'])
    // The link's stopPropagation must not toggle the row's inline expand.
    expect(container.querySelectorAll('[data-testid="readblock"]').length).toBe(0)
    unmount(root)
  })

  it('falls back to a plain single row when the call is not a chat tool-call node', () => {
    const snapshot = snapshotOf([], {})
    const useSession = ((selector: (s: ConversationSnapshot) => unknown) => selector(snapshot)) as MergedToolRowProps['useSession']
    const { container, root } = render({ callId: 'subcall', useSession })
    expect(container.querySelector('[data-testid="disclosure"]')).not.toBeNull()
    expect(container.querySelectorAll('.mtc-child-row').length).toBe(0)
    unmount(root)
  })

  it('merges non-read tools with their variant title and expandable child rows', () => {
    const snapshot = snapshotOf(['a', 'b'], {
      a: { callId: 'a', block: runningCall('a', 'bash') },
      b: { callId: 'b', block: runningCall('b', 'bash') },
    })
    const useSession = ((selector: (s: ConversationSnapshot) => unknown) => selector(snapshot)) as MergedToolRowProps['useSession']
    const { container, root } = render({ callId: 'a', toolName: 'bash', cfg: { ...CFG, tools: [] }, useSession })
    expect(container.textContent).toContain('Bash')
    // A running bash still carries its args as the IN body, so the row expands.
    const row = container.querySelector('.mtc-child-row') as HTMLDivElement
    expect(row.dataset.static).toBeUndefined()
    expect(row.getAttribute('role')).toBe('button')
    unmount(root)
  })

  it('keeps a running read child row static (nothing to expand)', () => {
    const snapshot = snapshotOf(['a', 'b'], {
      a: { callId: 'a', block: { ...runningCall('a', 'read'), argsRaw: JSON.stringify({ file_path: 'a.ts' }) } },
      b: { callId: 'b', block: { ...runningCall('b', 'read'), argsRaw: JSON.stringify({ file_path: 'b.ts' }) } },
    })
    const useSession = ((selector: (s: ConversationSnapshot) => unknown) => selector(snapshot)) as MergedToolRowProps['useSession']
    const { container, root } = render({ callId: 'a', cfg: { ...CFG, tools: [] }, useSession })
    const row = container.querySelector('.mtc-child-row') as HTMLDivElement
    expect(row.dataset.static).toBe('true')
    expect(row.getAttribute('role')).toBeNull()
    act(() => { row.click() })
    expect(container.querySelectorAll('[data-testid="readblock"]').length).toBe(0)
    unmount(root)
  })

  it('renders a write child path as an open-file link (file tools openable)', () => {
    const snapshot = snapshotOf(['a', 'b'], {
      a: { callId: 'a', block: settledWrite('a', 'out.ts') },
      b: { callId: 'b', block: settledWrite('b', 'out2.ts') },
    })
    const useSession = ((selector: (s: ConversationSnapshot) => unknown) => selector(snapshot)) as MergedToolRowProps['useSession']
    const opened: string[] = []
    const { container, root } = render({
      callId: 'a',
      toolName: 'write',
      cfg: { ...CFG, tools: [] },
      useSession,
      openFile: (path: string) => { opened.push(path) },
    })
    expect(container.textContent).toContain('Write')
    const link = container.querySelector('.mtc-child-path-link') as HTMLButtonElement
    expect(link).not.toBeNull()
    act(() => { link.click() })
    expect(opened).toEqual(['out2.ts'])
    unmount(root)
  })
})
