/**
 * Pure card/row derivation from a frozen call slice, mirroring ui-tool's
 * tool-call/read-card/search-card/diff-card/terminal-card/web-card models at
 * the plugin boundary (those models are ui-tool internals and cannot be
 * imported cross-package). Same wire contract, same defensive treatment of
 * untrusted result views. A merged row renders the same surface the built-in
 * row would: a variant title/icon plus a card primitive or IN/OUT text.
 * @module
 */
import {
  resolveWorkspacePath,
  type ToolCallBlock, type ToolResultNode,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {
  DiffBlockProps, DiffHunk, ReadBlockProps, SearchBlockProps, SearchFileGroup,
  TerminalBlockProps, WebBlockProps,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { classifyTool, VARIANT_TITLES, TOOL_TITLES, type ToolVariant } from './tool-names.ts'

/** Row state semantic, mirroring ui-tool's ToolRowState. */
export type RowState = 'running' | 'ok' | 'error' | 'stopped'

export type { ToolVariant } from './tool-names.ts'

/** Read-card props the ReadBlock primitive draws (per-render maxLines owned by the caller). */
export type ReadCardModel = Pick<ReadBlockProps, 'label' | 'lines' | 'totalLines' | 'lang'>

/**
 * Distributive `Omit`: a plain `Omit<A | B, K>` keeps only the keys common to
 * both members, dropping the discriminated `files`/`paths` fields. Distributing
 * over the naked type parameter preserves each shape.
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never

/** Search-card props plus the capped-result recovery locator (mirrors ui-tool). */
export interface SearchCardModel {
  readonly card: DistributiveOmit<SearchBlockProps, 'maxLines' | 'className'>
  /** The result view's replacement title, which outranks the args summary. */
  readonly title: string | undefined
  readonly recovery: string | undefined
}

/** Diff-card props (mirrors ui-tool; maxLines/className belong to the render site). */
export interface DiffCardModel {
  readonly card: Pick<DiffBlockProps, 'diffs'>
}

/** Terminal-card props (mirrors ui-tool; maxLines/className/labels belong to the render site). */
export interface TerminalCardModel {
  readonly card: Pick<TerminalBlockProps, 'command' | 'cwd' | 'output' | 'exitCode' | 'signal' | 'running'>
  /** The call view's model-authored description shown above the card. */
  readonly description: string | undefined
}

/** True when a settled terminal card reports a failing exit (mirrors ui-tool). */
export function terminalFailed(model: TerminalCardModel): boolean {
  const { exitCode, signal, running } = model.card
  return running !== true && ((exitCode !== undefined && exitCode !== 0) || signal !== undefined)
}

/** Everything a merged row needs, derived once from the frozen slice. */
export interface CallRowModel {
  readonly state: RowState
  readonly variant: ToolVariant
  /** Row title: variant title, or the tool-owned title when it refines one. */
  readonly title: string
  /** Args/result-derived one-line summary (path for file tools, query for searches, …). */
  readonly summary: string
  /** Expanded-body input text (pretty args); null = no input section. */
  readonly body: string | null
  /** Flattened result text; null while running or when the result carries no text. */
  readonly output: string | null
  /** First result line on an error row (the collapsed summary's error text). */
  readonly errorSummary: string | null
  /** Openable workspace path from args; absent for non-file tools and errors. */
  readonly filePath: string | undefined
  /** Whether the row has anything to expand (a card, args body, or output). */
  readonly expandable: boolean
  /** Expanded-body content cards, mutually exclusive, or null when absent. */
  readonly terminal: TerminalCardModel | null
  readonly diff: DiffCardModel | null
  readonly read: ReadCardModel | null
  readonly search: SearchCardModel | null
  readonly web: WebBlockProps | null
}

/**
 * Flatten a settled result's content blocks to display text.
 * @param node - settled result node.
 * @returns joined text (may be empty).
 */
export function resultText(node: ToolResultNode): string {
  const parts: string[] = []
  for (const block of node.content) {
    if (block.type === 'text') parts.push(block.text)
    else parts.push(JSON.stringify(block))
  }
  if (parts.length === 0 && node.error !== undefined) parts.push(`${node.error.name}: ${node.error.code}`)
  return parts.join('\n')
}

function firstLine(text: string): string {
  const nl = text.indexOf('\n')
  return nl === -1 ? text : text.slice(0, nl)
}

/** Strip the workspace root from a workspace-rooted absolute path (display only). */
export function relativizeToCwd(text: string, cwd: string | undefined): string {
  if (cwd === undefined || cwd === '') return text
  const root = cwd.replace(/[/\\]+$/, '')
  if (text.startsWith(`${root}/`) || text.startsWith(`${root}\\`)) return text.slice(root.length + 1)
  return text
}

function parseArgs(argsRaw: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(argsRaw)
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : undefined
  } catch {
    return undefined
  }
}

function pickString(args: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = args[key]
    if (typeof value === 'string' && value !== '') return value
  }
  return undefined
}

/** Summary key preference per row variant (args-derived, mirrors ui-tool). */
const SUMMARY_KEYS: Record<ToolVariant, readonly string[]> = {
  bash: ['description', 'command'],
  read: ['path', 'file_path', 'url'],
  search: ['query', 'pattern', 'url'],
  write: ['path', 'file_path'],
  edit: ['path', 'file_path'],
  code: ['description'],
  others: [],
}

function deriveSummary(variant: ToolVariant, argsRaw: string): string {
  const parsed = parseArgs(argsRaw)
  if (parsed === undefined) return firstLine(argsRaw)
  const picked = pickString(parsed, SUMMARY_KEYS[variant])
  if (picked !== undefined) return firstLine(picked)
  for (const value of Object.values(parsed)) {
    if (typeof value === 'string' && value !== '') return firstLine(value)
  }
  return firstLine(argsRaw)
}

/** Path keys only — never `url` (web_fetch lands on the read variant). */
const FILE_PATH_KEYS = ['path', 'file_path'] as const

/** File-tool variants whose summary may be an openable workspace path. */
const FILE_PATH_VARIANTS: ReadonlySet<ToolVariant> = new Set(['read', 'write', 'edit'])

function deriveFilePath(variant: ToolVariant, argsRaw: string): string | undefined {
  if (!FILE_PATH_VARIANTS.has(variant)) return undefined
  const parsed = parseArgs(argsRaw)
  if (parsed === undefined) return undefined
  return pickString(parsed, FILE_PATH_KEYS)?.split('\n')[0]
}

function deriveBody(variant: ToolVariant, argsRaw: string): string | null {
  if (argsRaw === '') return null
  const parsed = parseArgs(argsRaw)
  if (parsed === undefined) return argsRaw
  // The code row's expanded body IS the program, not the args JSON envelope.
  if (variant === 'code') {
    const code = parsed.code
    if (typeof code === 'string' && code !== '') return code
  }
  return JSON.stringify(parsed, null, 2)
}

/** Derive the row model for one call of a grouped tool. */
export function callRowModel(
  toolName: string,
  block: ToolCallBlock,
  cwd: string | undefined,
): CallRowModel {
  const done = 'kind' in block
  const argsRaw = (done ? block.call?.argsRaw : block.argsRaw) ?? ''
  const state: RowState = !done ? 'running'
    : block.error?.code === 'interrupted' ? 'stopped'
      : block.isError ? 'error' : 'ok'
  const variant = classifyTool(toolName)
  const terminal = terminalCardOf(block, cwd)
  const read = readCardOf(block, cwd)
  const diff = diffCardOf(block)
  const search = searchCardOf(block)
  const web = webCardOf(block)
  const base = argsRaw === '' ? block.callId : relativizeToCwd(deriveSummary(variant, argsRaw), cwd)
  const toolTitle = TOOL_TITLES[toolName]
  // Others keeps the static "Tool call" title; the real tool name rides the
  // summary slot unless the tool owns a specific title (mirrors ui-tool).
  const argsSummary = variant === 'others' && toolName !== '' && toolTitle === undefined
    ? `${toolName} · ${base}`
    : base
  const filePath = deriveFilePath(variant, argsRaw)
  const output = done ? (resultText(block) || null) : null
  const errorSummary = state === 'error' && output !== null ? firstLine(output) : null
  // A card's own summary outranks the args summary: the terminal presenter's
  // description is the contract's above-card text, and a search result view's
  // replacement title names the query the tool itself chose (mirrors ui-tool).
  const summary = terminal?.description ?? search?.title ?? argsSummary
  // Single-file tools never expose an args body — the path link is the only
  // args interaction (mirrors ui-tool's singleFile rule).
  const body = filePath !== undefined ? null : deriveBody(variant, argsRaw)
  // A failing exit status is the terminal card's own error signal: the call
  // settles isError:false, and the red state dot is its only collapsed signal.
  const finalState = state === 'ok' && terminal !== null && terminalFailed(terminal)
    ? 'error'
    : state
  const expandable = terminal !== null || diff !== null || read !== null
    || search !== null || web !== null || body !== null || output !== null
  return {
    state: finalState,
    variant,
    title: toolTitle ?? VARIANT_TITLES[variant],
    summary,
    body,
    output,
    errorSummary,
    filePath,
    expandable,
    terminal,
    diff,
    read,
    search,
    web,
  }
}

/** Read-card derivation, or null when this call is not a read card (mirrors ui-tool). */
function readCardOf(block: ToolCallBlock, cwd: string | undefined): ReadCardModel | null {
  if (!('kind' in block)) return null
  const result = block.resultView?.card === 'read' ? block.resultView : null
  if (result === null) return null
  if (!Array.isArray(result.lines)) return null
  const lines = result.lines
    .filter(line => typeof line === 'object' && line !== null
      && typeof (line as { number?: unknown }).number === 'number'
      && typeof (line as { text?: unknown }).text === 'string')
    .map(line => ({ number: (line as { number: number }).number, text: (line as { text: string }).text }))
  return {
    label: result.title ?? relativizeToCwd(result.path, cwd),
    lines,
    totalLines: typeof result.totalLines === 'number' ? result.totalLines : lines.length,
    lang: typeof result.lang === 'string' ? result.lang : undefined,
  }
}

function isValidFiles(files: unknown): files is SearchFileGroup[] {
  return Array.isArray(files) && files.every(file =>
    typeof file === 'object' && file !== null
    && typeof (file as { path?: unknown }).path === 'string'
    && Array.isArray((file as { matches?: unknown }).matches)
    && (file as { matches: unknown[] }).matches.every(match =>
      typeof match === 'object' && match !== null
      && typeof (match as { lineNumber?: unknown }).lineNumber === 'number'
      && typeof (match as { line?: unknown }).line === 'string'))
}

function flattenContent(content: readonly { type: string; text?: string }[]): string | undefined {
  const text = content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
  return text === '' ? undefined : text
}

/** Search-card derivation, or null when this call is not a search card (mirrors ui-tool). */
function searchCardOf(block: ToolCallBlock): SearchCardModel | null {
  if (!('kind' in block)) return null
  const result = block.resultView?.card === 'search' ? block.resultView : null
  if (result === null) return null
  const common = { truncated: result.truncated, total: result.total }
  const recovery = result.truncated ? flattenContent(block.content) : undefined
  if (result.shape === 'matches') {
    if (!isValidFiles(result.files)) return null
    return { title: result.title, recovery, card: { kind: 'matches', files: result.files, ...common } }
  }
  if (result.shape !== 'paths') return null
  if (!Array.isArray(result.paths) || !result.paths.every(path => typeof path === 'string')) return null
  return { title: result.title, recovery, card: { kind: 'paths', paths: result.paths, ...common } }
}

/** Narrow a wire `card:'diff'` view's `diffs` to well-formed hunks (mirrors ui-tool). */
function narrowDiffs(diffs: unknown): DiffHunk[] | null {
  if (!Array.isArray(diffs) || diffs.length === 0) return null
  const out: DiffHunk[] = []
  for (const hunk of diffs) {
    if (typeof hunk !== 'object' || hunk === null) return null
    const { path, oldText, newText } = hunk as Record<string, unknown>
    if (typeof path !== 'string') return null
    if (oldText !== null && typeof oldText !== 'string') return null
    if (typeof newText !== 'string') return null
    out.push({ path, oldText, newText })
  }
  return out
}

/** Diff-card derivation, or null when this call is not a diff card (mirrors ui-tool). */
function diffCardOf(block: ToolCallBlock): DiffCardModel | null {
  if (!('kind' in block)) {
    const call = block.callView?.card === 'diff' ? block.callView : null
    const diffs = call === null ? null : narrowDiffs(call.diffs)
    return diffs === null ? null : { card: { diffs } }
  }
  const result = block.resultView?.card === 'diff' ? block.resultView : null
  const diffs = result === null ? null : narrowDiffs(result.diffs)
  return diffs === null ? null : { card: { diffs } }
}

/**
 * Resolve a terminal view's working directory the way the render-intent
 * contract assigns it: an absolute path is used as-is, a relative one joins
 * under the session workspace, and an omitted one IS the session workspace.
 * @param viewCwd - the cwd the terminal call view carries, if any.
 * @param sessionCwd - the session workspace root, if the caller knows it.
 * @returns the working directory for the prompt label, or undefined.
 */
function resolveTerminalCwd(viewCwd: string | undefined, sessionCwd: string | undefined): string | undefined {
  if (viewCwd === undefined || viewCwd === '') return sessionCwd
  if (sessionCwd === undefined || sessionCwd === '') return viewCwd
  return resolveWorkspacePath(sessionCwd, viewCwd)
}

/** Terminal-card derivation, or null when this call is not a terminal card (mirrors ui-tool). */
function terminalCardOf(block: ToolCallBlock, sessionCwd: string | undefined): TerminalCardModel | null {
  const call = block.callView?.card === 'terminal' ? block.callView : null
  if (!('kind' in block)) {
    return call === null ? null : {
      description: call.description,
      card: {
        command: call.title,
        cwd: resolveTerminalCwd(call.cwd, sessionCwd),
        output: undefined,
        exitCode: undefined,
        signal: undefined,
        running: true,
      },
    }
  }
  const result = block.resultView?.card === 'terminal' ? block.resultView : null
  if (result === null) return null
  return {
    description: call?.description,
    card: {
      command: result.title ?? call?.title ?? '',
      cwd: call === null ? undefined : resolveTerminalCwd(call.cwd, sessionCwd),
      output: result.output,
      exitCode: result.exitCode,
      signal: result.signal,
      running: false,
    },
  }
}

/** Web-card derivation, or null when this call is not a web card (mirrors ui-tool). */
function webCardOf(block: ToolCallBlock): WebBlockProps | null {
  if (!('kind' in block)) return null
  const result = block.resultView
  if (result?.card !== 'web') return null
  if (result.kind === 'search') {
    return {
      kind: 'search',
      answer: result.answer,
      sources: result.sources.map(source => ({
        url: source.url,
        title: source.title,
        snippet: source.snippet,
        publishedAt: source.publishedAt,
      })),
      truncated: result.truncated,
    }
  }
  if (result.kind === 'fetch') {
    return {
      kind: 'fetch',
      url: result.url,
      statusCode: result.statusCode,
      truncated: result.truncated,
    }
  }
  return null
}
