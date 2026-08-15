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
})
