/**
 * Merged tool-call row — the shadowed `tool.call.toolview` registrant.
 *
 * For the first call of a consecutive run of grouped tools, renders the run as
 * one card (the first call's full row) plus one compact child row per
 * continuation call. For a continuation call, renders nothing: the seat stays
 * empty and the injected stylesheet collapses it out of the flow. When the
 * call is not a chat tool-call node at all (e.g. dispatched as a subcall),
 * falls back to a plain single row so the call never disappears.
 *
 * The row surface mirrors the built-in generic ToolRow: a variant title/icon
 * plus the settled card (read/search/diff/terminal/web) or IN/OUT text.
 *
 * Everything here is a pure function of the chat snapshot + the frozen call
 * slices (replay-deterministic); expand state is component-local view state.
 * @module
 */
import { memo, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import {
  DiffBlock, DisclosureRow, IconApiOutline14, IconBrowseOutline16, IconCodeOutline16,
  IconEditOutline16, IconSearchOutline16, IconSparkle16, ReadBlock, SearchBlock, StateDot,
  TerminalBlock, WebBlock, type TerminalBlockLabels,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { MergeToolCallsConfig } from '../types.ts'
import { callRowModel, type CallRowModel, type RowState, type ToolVariant } from './card-model.ts'
import { readRun } from './merge-run.ts'

/** Chat rows show a capped card; the details panel stays the full-height surface. */
const CHAT_READ_MAX_LINES = 8
const CHAT_SEARCH_MAX_LINES = 8
const CHAT_DIFF_MAX_LINES = 8

/** Locale seat and inject face of the merged row registration. */
export type MergedToolRowProps = ToolCallViewProps
  & PropsLocale<'merge-tool-calls'>
  & { readonly cfg: MergeToolCallsConfig }

/** Variant leading icons (figma table); all glyphs render at 14 inside the 16px leading box. */
const VARIANT_ICONS: Record<ToolVariant, ReactNode> = {
  search: <IconSearchOutline16 size={14} />,
  read: <IconBrowseOutline16 size={14} />,
  bash: <IconApiOutline14 size={14} />,
  write: <IconEditOutline16 size={14} />,
  edit: <IconEditOutline16 size={14} />,
  code: <IconCodeOutline16 size={14} />,
  others: <IconSparkle16 size={14} />,
}

/**
 * Per-variant locale key for the merged-count summary (`{n} Files`, `{n}
 * Commands`, …). Replaces the first call's file path on the main row when the
 * run merges more than one call, so the main row reads `Read · 5 Files` and
 * the file paths move to the collapsed child rows.
 */
const VARIANT_COUNT_KEY: Record<ToolVariant, 'countFiles' | 'countQueries' | 'countCommands' | 'countPrograms' | 'countCalls'> = {
  read: 'countFiles',
  write: 'countFiles',
  edit: 'countFiles',
  search: 'countQueries',
  bash: 'countCommands',
  code: 'countPrograms',
  others: 'countCalls',
}

/** Leading-slot state substitution, mirroring the shipped row. */
function leadingFor(state: RowState, icon: ReactNode): ReactNode {
  switch (state) {
    case 'error': return <StateDot state="error" />
    case 'stopped': return <StateDot state="warning" />
    default: return icon
  }
}

/** Visually hidden run-state label (the StateDot and sweep are colour-only). */
function stateStatus(state: RowState, t: MergedToolRowProps['t']): string | null {
  switch (state) {
    case 'running': return t('running')
    case 'error': return t('failed')
    case 'stopped': return t('stopped')
    default: return null
  }
}

/** TerminalBlock display copy from the plugin's own dictionary. */
function terminalLabels(t: MergedToolRowProps['t']): TerminalBlockLabels {
  return {
    signal: signal => t('terminal.signal', { signal }),
    exitCode: code => t('terminal.exitCode', { code }),
    running: t('terminal.running'),
    failed: t('terminal.failed'),
    done: t('terminal.done'),
    copy: t('terminal.copy'),
    copied: t('terminal.copied'),
    noOutput: t('terminal.noOutput'),
    collapseAria: t('terminal.collapseAria'),
    collapse: t('terminal.collapse'),
    expandAria: hidden => t('terminal.expandAria', { n: hidden }),
    expand: hidden => t('terminal.expandRest', { n: hidden }),
  }
}

/** One call's expanded-body card, mirroring the built-in ToolRow body. */
function CardBody({ model, t }: { model: CallRowModel; t: MergedToolRowProps['t'] }) {
  if (model.terminal !== null) {
    return <TerminalBlock {...model.terminal.card} maxLines={Infinity} labels={terminalLabels(t)} />
  }
  if (model.diff !== null) {
    return <DiffBlock {...model.diff.card} maxLines={CHAT_DIFF_MAX_LINES} />
  }
  if (model.read !== null) {
    return <ReadBlock {...model.read} maxLines={CHAT_READ_MAX_LINES} />
  }
  if (model.search !== null) {
    return (
      <>
        <SearchBlock {...model.search.card} maxLines={CHAT_SEARCH_MAX_LINES} />
        {model.search.recovery !== undefined && (
          <div className="mtc-recovery">{model.search.recovery}</div>
        )}
      </>
    )
  }
  if (model.web !== null) {
    return <WebBlock {...model.web} />
  }
  const hasBody = model.body !== null
  const hasOutput = model.output !== null
  if (!hasBody && !hasOutput) return null
  return (
    <div className="mtc-io-card">
      {hasBody && (
        <div className="mtc-io-section">
          <span className="mtc-io-label">IN</span>
          <span className="mtc-io-text">{model.body}</span>
        </div>
      )}
      {hasBody && hasOutput && <span className="mtc-io-divider" aria-hidden />}
      {hasOutput && (
        <div className="mtc-io-section">
          <span className="mtc-io-label">OUT</span>
          <span className="mtc-io-text" data-error={model.state === 'error' || undefined}>{model.output}</span>
        </div>
      )}
    </div>
  )
}

/**
 * The run's main card: the first call's chrome (variant title/icon + state)
 * plus, for a single call, its expandable content card. For a merged run the
 * main row's collapsed summary is the count (`Read · 5 Files`) and the
 * expanded body is the child-rows block (passed in as `children`); the first
 * call is rendered as the first child row so every file path lands on a child
 * row, never on the main row.
 */
export const RowCard = memo(function RowCard({
  toolName, block, cwd, openFile, inspect, t, mergedCount, children,
}: {
  toolName: string
  block: ToolCallBlock
  cwd: string | undefined
  openFile: (path: string) => void
  inspect: (() => void) | undefined
  t: MergedToolRowProps['t']
  /** Continuation-call count; 0 means a single-call row (no child rows). */
  mergedCount: number
  /** Child rows for the merged run (all calls, including the first). */
  children?: ReactNode
}) {
  const model = callRowModel(toolName, block, cwd)
  const [expanded, setExpanded] = useState(false)
  const hasChildren = mergedCount > 0
  const expandable = model.expandable || hasChildren
  const open = expanded && expandable
  const status = stateStatus(model.state, t)
  const failureLine = model.state === 'error' ? model.errorSummary ?? null : null
  // Merged runs trade the first file path + `+n` suffix for a count summary,
  // so the main row reads `Read · 5 Files`; the file paths live on the child
  // rows. An error on the first call still surfaces its error text instead.
  const summaryText = hasChildren && failureLine === null
    ? t(VARIANT_COUNT_KEY[model.variant], { n: String(mergedCount + 1) })
    : failureLine ?? model.summary
  // The open-file link only applies to single-call rows (the merged summary is
  // a count, not a path).
  const fileLink = !hasChildren && model.filePath !== undefined && openFile !== undefined && failureLine === null
  const openFileClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (model.filePath !== undefined) openFile(model.filePath)
  }
  return (
    <div className="mtc-row" data-state={model.state} data-variant={model.variant} data-merged={hasChildren || undefined}>
      {status !== null && <span className="mtc-visually-hidden">{status}</span>}
      <DisclosureRow
        rowClassName="mtc-title-row"
        titleClassName="mtc-title"
        leadingClassName="mtc-leading"
        chevronClassName="mtc-chevron"
        icon={leadingFor(model.state, VARIANT_ICONS[model.variant])}
        title={model.title}
        open={open}
        expandable={expandable}
        expandOnRowClick
        keepContentWhenOpen
        onToggle={() => { setExpanded(value => !value) }}
        collapsedContent={summaryText !== '' && (
          <>
            <span className="mtc-sep" aria-hidden />
            {fileLink ? (
              <button type="button" className="mtc-summary-link" onClick={openFileClick}>{summaryText}</button>
            ) : (
              <span className="mtc-summary">{summaryText}</span>
            )}
          </>
        )}
      >
        {/* Single-call mode: the first call's expandable content card lives in
            the disclosure body. Merged mode renders nothing here — the child
            rows block is a sibling below, animated via its own collapse grid. */}
        {!hasChildren && (
          <div className="mtc-card-body">
            <CardBody model={model} t={t} />
            {inspect !== undefined && (
              <button type="button" className="mtc-inspect" onClick={inspect}>Inspect</button>
            )}
          </div>
        )}
      </DisclosureRow>
      {hasChildren && (
        // The animated children block. Lives outside DisclosureRow so the
        // grid-template-rows transition can keep the rows in the DOM while
        // collapsing (DisclosureRow would unmount them instantly). The
        // --mtc-sep-left custom property is set by the parent on .mtc-root.
        <div className="mtc-children-collapse" data-open={open || undefined}>
          <div className="mtc-children">
            {children}
          </div>
        </div>
      )}
      {hasChildren && open && inspect !== undefined && (
        <button type="button" className="mtc-inspect" onClick={inspect}>Inspect</button>
      )}
    </div>
  )
})

/**
 * One compact continuation row: the main row's tail structure ([sep dot][path]).
 * An expandable call toggles the inline content card on click (mirroring the
 * main row's whole-row disclosure); a read/write/edit-family path additionally
 * renders as an open-file link (the sidebar preview) that stops propagation,
 * exactly like the main row's summary link.
 */
export const ChildRow = memo(function ChildRow({
  toolName, block, cwd, openFile, t,
}: {
  toolName: string
  block: ToolCallBlock
  cwd: string | undefined
  openFile: (path: string) => void
  t: MergedToolRowProps['t']
}) {
  const model = callRowModel(toolName, block, cwd)
  const [open, setOpen] = useState(false)
  const stateLabel = stateStatus(model.state, t)
  const expandable = model.expandable
  const toggle = (): void => { setOpen(value => !value) }
  const openFileClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (model.filePath !== undefined) openFile(model.filePath)
  }
  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
  }
  return (
    <div className="mtc-child">
      <div
        className="mtc-child-row"
        data-open={expandable && open || undefined}
        data-static={expandable ? undefined : true}
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? open : undefined}
        onClick={expandable ? toggle : undefined}
        onKeyDown={expandable ? onRowKeyDown : undefined}
      >
        <span className="mtc-sep" aria-hidden />
        {model.filePath !== undefined ? (
          <button type="button" className="mtc-child-path-link" onClick={openFileClick}>{model.summary}</button>
        ) : (
          <span className="mtc-child-path">{model.summary}</span>
        )}
        {stateLabel !== null && (
          <span className="mtc-child-state" data-error={model.state === 'error' || undefined}>{stateLabel}</span>
        )}
      </div>
      {expandable && open && (
        <div className="mtc-child-body">
          <CardBody model={model} t={t} />
        </div>
      )}
    </div>
  )
})

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
export function MergedToolRow({ callId, toolName, block, cwd, openFile, inspect, t, cfg, useSession }: MergedToolRowProps) {
  const run = useSession(snapshot => readRun(
    snapshot.chat.order,
    snapshot.chat.nodes,
    callId,
    cfg.tools,
    cfg.groupBy,
    cfg.maxGroupSize,
  ))
  const rootRef = useRef<HTMLDivElement>(null)
  /** Main separator dot's left offset from the card root; null before first measure. */
  const [sepLeft, setSepLeft] = useState<number | null>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (root === null) return
    const sep = root.querySelector<HTMLElement>('.mtc-row .mtc-sep')
    if (sep === null) return
    const measure = (): void => {
      setSepLeft(Math.round(sep.getBoundingClientRect().left - root.getBoundingClientRect().left))
    }
    measure()
    // Font swaps, locale switches, and column resizes move the dot; keep the
    // alignment current without re-running the effect.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(root)
    return () => { observer?.disconnect() }
  }, [run === null ? null : run.blocks[0]?.callId ?? null])

  if (run === null) {
    // Not a chat tool-call node (subcall dispatch): never blank the call.
    return (
      <RowCard
        toolName={toolName}
        block={block}
        cwd={cwd}
        openFile={openFile}
        inspect={inspect}
        t={t}
        mergedCount={0}
      />
    )
  }
  if (!run.isFirst) return null
  const hasChildren = run.blocks.length > 1
  return (
    <div
      className="mtc-root"
      data-tool={toolName}
      ref={rootRef}
      // The measured dot column lands the children's sep dot on the main row's
      // summary column. Set on the root so it cascades into RowCard's
      // .mtc-children block.
      style={sepLeft === null ? undefined : { ['--mtc-sep-left']: `${sepLeft}px` } as CSSProperties}
    >
      <RowCard
        toolName={toolName}
        block={run.blocks[0] ?? block}
        cwd={cwd}
        openFile={openFile}
        inspect={inspect}
        t={t}
        mergedCount={run.blocks.length - 1}
      >
        {/* Every call (including the first) renders as a child row, so the
            main row's summary stays a count (`Read · 5 Files`) and every file
            path lands on its own child row. */}
        {hasChildren && run.blocks.map(child => (
          <ChildRow key={child.callId} toolName={toolName} block={child} cwd={cwd} openFile={openFile} t={t} />
        ))}
      </RowCard>
    </div>
  )
}
