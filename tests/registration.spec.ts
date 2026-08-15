/** Registration spec: the client apply shadows the shipped toolview keys at priority -1. */
import { describe, expect, it } from 'vitest'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { apply } from '../src/client/index.ts'
import { ALL_TOOL_NAMES } from '../src/client/tool-names.ts'

interface RegisterCall {
  readonly name: string
  readonly key: string | undefined
  readonly priority: number | undefined
}

function stubCtx() {
  const registrations: RegisterCall[] = []
  const injectCalls: Array<{ name: string; factory: () => unknown }> = []
  const effects: Array<() => unknown> = []
  const ctx = {
    slots: {
      inject: (name: string, factory: () => unknown) => {
        injectCalls.push({ name, factory })
        return () => {}
      },
      register: (options: { name: string; key?: string; priority?: number }, _component: unknown) => {
        registrations.push({ name: options.name, key: options.key, priority: options.priority })
        return () => {}
      },
    },
    locale: {
      register: (_ns: string, _dict: unknown) => () => {},
    },
    effect: (fn: () => unknown) => {
      effects.push(fn)
      return () => {}
    },
  }
  return { ctx, registrations, injectCalls, effects }
}

describe('client apply', () => {
  it('registers one shadowed toolview per configured tool at priority -1', () => {
    const { ctx, registrations, injectCalls } = stubCtx()
    apply(ctx as unknown as ClientContext, { tools: ['read', 'grep'] })

    expect(injectCalls.map(call => call.name)).toEqual(['tool.call.toolview', 'tool.call.toolview'])
    for (const call of injectCalls) {
      call.factory()
    }
    expect(registrations.map(entry => entry.key)).toEqual(['read', 'grep'])
    expect(registrations.every(entry => entry.name === 'tool.call.toolview' && entry.priority === -1)).toBe(true)
  })

  it('registers every built-in tool when tools is empty', () => {
    const { ctx, registrations, injectCalls } = stubCtx()
    apply(ctx as unknown as ClientContext, { tools: [] })

    expect(injectCalls.length).toBe(ALL_TOOL_NAMES.length)
    for (const call of injectCalls) {
      call.factory()
    }
    expect(registrations.map(entry => entry.key)).toEqual([...ALL_TOOL_NAMES])
  })

  it('installs the locale dictionaries and the stylesheet effect', () => {
    const { ctx, effects } = stubCtx()
    apply(ctx as unknown as ClientContext, {})
    expect(effects.length).toBe(2)
  })

  it('applies defaults when no config arrives', () => {
    const { ctx, injectCalls } = stubCtx()
    apply(ctx as unknown as ClientContext)
    // Default tools: the full built-in list (empty config = all tools).
    expect(injectCalls.length).toBe(ALL_TOOL_NAMES.length)
  })
})
