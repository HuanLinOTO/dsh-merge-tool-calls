/** Unit tests for the row-model derivation (card-model.ts). */
import { describe, expect, it } from 'vitest'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import { callRowModel } from '../src/client/card-model.ts'

function runningCall(callId: string, name: string, argsRaw: string): ToolCallBlock {
  return { callId, name, argsRaw, turn: 1, step: 1, time: 0, callView: null, subCalls: [] }
}

describe('callRowModel', () => {
  it('derives an openable file path only for read-family calls', () => {
    // A search call's `path` arg is the directory searched, never a file:
    // clicking it must not open the directory.
    const grep = callRowModel('grep', runningCall('g1', 'grep', JSON.stringify({ query: 'needle', path: 'D:\\search-root' })), undefined)
    expect(grep.filePath).toBeUndefined()
    expect(grep.summary).toBe('needle')

    const glob = callRowModel('glob', runningCall('g2', 'glob', JSON.stringify({ pattern: '**/*.ts', path: 'D:\\search-root' })), undefined)
    expect(glob.filePath).toBeUndefined()
  })

  it('derives the file path from read args (file_path or path)', () => {
    const byFilePath = callRowModel('read', runningCall('r1', 'read', JSON.stringify({ file_path: 'src/a.ts' })), undefined)
    expect(byFilePath.filePath).toBe('src/a.ts')
    const byPath = callRowModel('read', runningCall('r2', 'read', JSON.stringify({ path: 'src/b.ts' })), undefined)
    expect(byPath.filePath).toBe('src/b.ts')
  })

  it('mirrors the built-in variant titles and summaries for every tool family', () => {
    const write = callRowModel('write', runningCall('w1', 'write', JSON.stringify({ file_path: 'src/a.ts', content: 'x' })), undefined)
    expect(write.title).toBe('Write')
    expect(write.summary).toBe('src/a.ts')
    // File tools expose an openable path; single-file rows never show an args body.
    expect(write.filePath).toBe('src/a.ts')
    expect(write.body).toBeNull()

    const edit = callRowModel('edit', runningCall('e1', 'edit', JSON.stringify({ file_path: 'src/b.ts' })), undefined)
    expect(edit.title).toBe('Edit')
    expect(edit.filePath).toBe('src/b.ts')

    const bash = callRowModel('bash', runningCall('b1', 'bash', JSON.stringify({ description: 'List files', command: 'ls -la' })), undefined)
    expect(bash.title).toBe('Bash')
    expect(bash.summary).toBe('List files')
    expect(bash.filePath).toBeUndefined()

    const pwsh = callRowModel('pwsh', runningCall('p1', 'pwsh', JSON.stringify({ command: 'Get-ChildItem' })), undefined)
    expect(pwsh.title).toBe('Pwsh')
    expect(pwsh.summary).toBe('Get-ChildItem')

    const web = callRowModel('web_search', runningCall('s1', 'web_search', JSON.stringify({ query: 'hello' })), undefined)
    expect(web.title).toBe('Search')
    expect(web.summary).toBe('hello')

    const runCode = callRowModel('run_code', runningCall('c1', 'run_code', JSON.stringify({ code: 'console.log(1)', description: 'Say hi' })), undefined)
    expect(runCode.title).toBe('Code')
    expect(runCode.summary).toBe('Say hi')
    expect(runCode.body).toBe('console.log(1)')
  })

  it('gives unclassified tools the generic title and a toolName-prefixed summary', () => {
    const other = callRowModel('my_tool', runningCall('m1', 'my_tool', JSON.stringify({ foo: 'bar' })), undefined)
    expect(other.title).toBe('Tool call')
    expect(other.summary).toBe('my_tool · bar')
    expect(other.filePath).toBeUndefined()
  })

  it('marks a row expandable only when it carries a card, body, or output', () => {
    // Running read (no result view yet): nothing to expand.
    const running = callRowModel('read', runningCall('r1', 'read', JSON.stringify({ file_path: 'a.ts' })), undefined)
    expect(running.expandable).toBe(false)
    // Settled read with a read result view: expandable.
    const settled: ToolCallBlock = {
      kind: 'tool-result', seq: 1, time: 0, callId: 'r2',
      call: { name: 'read', argsRaw: JSON.stringify({ file_path: 'a.ts' }) },
      callTime: 0, content: [], isError: false, callView: null,
      resultView: { card: 'read', path: 'a.ts', offset: 1, lines: [{ number: 1, text: 'hello' }], totalLines: 1 },
      subCalls: [],
    }
    expect(callRowModel('read', settled, undefined).expandable).toBe(true)
    // A failing terminal exit surfaces as the row's error state.
    const failedBash: ToolCallBlock = {
      kind: 'tool-result', seq: 1, time: 0, callId: 'b2',
      call: { name: 'bash', argsRaw: JSON.stringify({ command: 'exit 2' }) },
      callTime: 0, content: [], isError: false, callView: null,
      resultView: { card: 'terminal', output: 'boom', exitCode: 2 },
      subCalls: [],
    }
    const model = callRowModel('bash', failedBash, undefined)
    expect(model.state).toBe('error')
    expect(model.expandable).toBe(true)
    expect(model.terminal).not.toBeNull()
  })
})
