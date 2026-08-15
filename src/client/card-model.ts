/**
 * Pure card/row derivation from a frozen call slice, mirroring ui-tool's
 * read-card/search-card/tool-call models at the plugin boundary (those models
 * are ui-tool internals and cannot be imported cross-package). Same wire
 * contract, same defensive treatment of untrusted result views.
 * @module
 */
import type { ReadBlockProps, SearchBlockProps, SearchFileGroup } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallBlock, ToolResultNode } from '@deepseek-ai/dsh-client-runtime/client'

/** Row state semantic, mirroring ui-tool's ToolRowState. */
export type RowState = 'running' | 'ok' | 'error' | 'stopped'

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
  readonly recovery: string | undefined
}

/** Everything a merged row needs, derived once from the frozen slice. */
export interface CallRowModel {
  readonly state: RowState
  /** Expanded-body content card, when the result view declares one. */
  readonly read: ReadCardModel | null
  readonly search: SearchCardModel | null
  /** Args-derived one-line summary (path for file tools, query for searches). */
  readonly summary: string
  /** Openable workspace path from args; absent for non-file tools and errors. */
  readonly filePath: string | undefined
  /** First result line on an error row (the collapsed summary's error text). */
  readonly errorSummary: string | null
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

/** Summary key preference per row family (args-derived, mirrors ui-tool). */
const SUMMARY_KEYS: Record<'read' | 'search', readonly string[]> = {
  read: ['path', 'file_path', 'url'],
  search: ['query', 'pattern', 'url'],
}

const FILE_PATH_KEYS = ['path', 'file_path'] as const

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
  const family: 'read' | 'search' = toolName === 'read' ? 'read' : 'search'
  const parsed = parseArgs(argsRaw)
  const picked = parsed === undefined
    ? undefined
    : pickString(parsed, SUMMARY_KEYS[family])
  const summary = picked === undefined && parsed === undefined ? argsRaw : (picked ?? block.callId)
  // Only read-family rows expose an openable file path (mirrors ui-tool's
  // FILE_PATH_VARIANTS): a search call's `path` arg is the directory searched,
  // not a file, and must not render as an open-file link.
  const filePath = family === 'read' && parsed !== undefined
    ? pickString(parsed, FILE_PATH_KEYS)?.split('\n')[0]
    : undefined
  const output = done ? (resultText(block) || null) : null
  const errorSummary = state === 'error' && output !== null ? firstLine(output) : null
  return {
    state,
    read: readCardOf(block, cwd),
    search: searchCardOf(block),
    summary: relativizeToCwd(summary, cwd),
    filePath,
    errorSummary,
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
    return { card: { kind: 'matches', files: result.files, ...common }, recovery }
  }
  if (result.shape !== 'paths') return null
  if (!Array.isArray(result.paths) || !result.paths.every(path => typeof path === 'string')) return null
  return { card: { kind: 'paths', paths: result.paths, ...common }, recovery }
}
