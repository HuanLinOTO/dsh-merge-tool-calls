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
 * Everything here is a pure function of the chat snapshot + the frozen call
 * slices (replay-deterministic); expand state is component-local view state.
 * @module
 */
import { memo, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import {
  DisclosureRow, IconBrowseOutline16, IconSearchOutline16, ReadBlock, SearchBlock, StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { MergeToolCallsConfig } from '../types.ts'
import { callRowModel, type CallRowModel, type RowState } from './card-model.ts'
import { readRun } from './merge-run.ts'

/** Chat rows show a capped card; the details panel stays the full-height surface. */
const CHAT_READ_MAX_LINES = 8
const CHAT_SEARCH_MAX_LINES = 8

/** Locale seat and inject face of the merged row registration. */
export type MergedToolRowProps = ToolCallViewProps
  & PropsLocale<'merge-tool-calls'>
  & { readonly cfg: MergeToolCallsConfig }

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

/** Title per row family (figma literals, not translatable copy). */
function rowTitle(toolName: string): string {
  return toolName === 'read' ? 'Read' : 'Search'
}

function rowIcon(toolName: string): ReactNode {
  return toolName === 'read' ? <IconBrowseOutline16 size={14} /> : <IconSearchOutline16 size={14} />
}

/** One call's expanded-body card content, or null (running/generic results). */
function CardBody({ model }: { model: CallRowModel }) {
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
  return null
}

/** The run's main card: the first call's full row (chrome + expandable card). */
export const RowCard = memo(function RowCard({
  toolName, block, cwd, openFile, inspect, t, mergedCount,
}: {
  toolName: string
  block: ToolCallBlock
  cwd: string | undefined
  openFile: (path: string) => void
  inspect: (() => void) | undefined
  t: MergedToolRowProps['t']
  /** Continuation-call count rendered as a muted `+n` suffix; 0 hides it. */
  mergedCount: number
}) {
  const model = callRowModel(toolName, block, cwd)
  const [expanded, setExpanded] = useState(false)
  const hasCard = model.read !== null || model.search !== null
  const open = expanded && hasCard
  const status = stateStatus(model.state, t)
  const failureLine = model.state === 'error' ? model.errorSummary ?? null : null
  const summaryText = failureLine ?? model.summary
  const suffix = failureLine === null && mergedCount > 0
    ? t('more', { n: String(mergedCount) })
    : null
  const fileLink = model.filePath !== undefined && openFile !== undefined && failureLine === null
  const openFileClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (model.filePath !== undefined) openFile(model.filePath)
  }
  return (
    <div className="mtc-row" data-state={model.state}>
      {status !== null && <span className="mtc-visually-hidden">{status}</span>}
      <DisclosureRow
        rowClassName="mtc-title-row"
        titleClassName="mtc-title"
        leadingClassName="mtc-leading"
        chevronClassName="mtc-chevron"
        icon={leadingFor(model.state, rowIcon(toolName))}
        title={rowTitle(toolName)}
        open={open}
        expandable={hasCard}
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
            {suffix !== null && <span className="mtc-summary-suffix">{suffix}</span>}
          </>
        )}
      >
        <div className="mtc-card-body">
          <CardBody model={model} />
          {inspect !== undefined && (
            <button type="button" className="mtc-inspect" onClick={inspect}>Inspect</button>
          )}
        </div>
      </DisclosureRow>
    </div>
  )
})

/**
 * One compact continuation row: the main row's tail structure ([sep dot][path]).
 * The row toggles the inline content card on click (mirroring the main row's
 * whole-row disclosure); a read-family path additionally renders as an
 * open-file link (the sidebar preview) that stops propagation, exactly like the
 * main row's summary link.
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
        data-open={open || undefined}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={onRowKeyDown}
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
      {open && (
        <div className="mtc-child-body">
          <CardBody model={model} />
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
 * separator dot sits after a variable-width title ("Read"/"Search"), so its
 * column depends on the rendered font. A layout effect measures the dot's
 * offset from the card root (once, plus on reflow via ResizeObserver) and
 * indents the children so their dots and paths land on the main row's columns
 * — no font/title constants to keep in sync.
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
    <div className="mtc-root" data-tool={toolName} ref={rootRef}>
      <RowCard
        toolName={toolName}
        block={run.blocks[0] ?? block}
        cwd={cwd}
        openFile={openFile}
        inspect={inspect}
        t={t}
        mergedCount={run.blocks.length - 1}
      />
      {hasChildren && (
        // The inline margin overrides the CSS fallback with the measured dot
        // column: the 2px dot + 8px sep right margin land the path exactly on
        // the main summary column.
        <div
          className="mtc-children"
          style={sepLeft === null ? undefined : { marginLeft: `${sepLeft}px` }}
        >
          {run.blocks.slice(1).map(child => (
            <ChildRow key={child.callId} toolName={toolName} block={child} cwd={cwd} openFile={openFile} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}
