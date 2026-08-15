/** Test double for @deepseek-ai/dsh-client-ui-primitives (see vitest.config.ts alias). */
import { type ReactNode } from 'react'

export function DisclosureRow({
  title, open, expandable, collapsedContent, children, onToggle, expandOnRowClick,
}: {
  title: string
  open: boolean
  expandable: boolean
  onToggle: () => void
  expandOnRowClick?: boolean
  keepContentWhenOpen?: boolean
  collapsedContent?: ReactNode
  children?: ReactNode
  className?: string
  rowClassName?: string
  leadingClassName?: string
  chevronClassName?: string
  titleClassName?: string
  icon?: ReactNode
}) {
  return (
    <div data-testid="disclosure" data-open={open || undefined} data-expandable={expandable || undefined}>
      <div data-testid="disclosure-row" role={expandOnRowClick ? 'button' : undefined} onClick={expandOnRowClick ? onToggle : undefined}>
        {title}
        {collapsedContent}
      </div>
      {open && children}
    </div>
  )
}

export function ReadBlock({ label }: { label?: string; lines?: unknown[]; totalLines?: number; lang?: string; maxLines?: number }) {
  return <div data-testid="readblock">{label}</div>
}

export function SearchBlock({ kind }: { kind?: string; files?: unknown[]; paths?: string[]; truncated?: boolean; total?: number; maxLines?: number }) {
  return <div data-testid="searchblock">{kind}</div>
}

export function DiffBlock({ diffs }: { diffs?: unknown[]; maxLines?: number }) {
  return <div data-testid="diffblock">{Array.isArray(diffs) ? diffs.length : 0} hunks</div>
}

export function TerminalBlock({ command }: { command?: string; cwd?: string; output?: string; exitCode?: number; signal?: string; running?: boolean; maxLines?: number; labels?: unknown }) {
  return <div data-testid="terminalblock">{command}</div>
}

export function WebBlock({ kind }: { kind?: string; url?: string; answer?: string; sources?: unknown[]; statusCode?: number; truncated?: boolean }) {
  return <div data-testid="webblock">{kind}</div>
}

export function StateDot({ state }: { state: string }) {
  return <span data-testid="statedot" data-state={state} />
}

export function IconBrowseOutline16() {
  return <span data-testid="icon-browse" />
}

export function IconSearchOutline16() {
  return <span data-testid="icon-search" />
}

export function IconApiOutline14() {
  return <span data-testid="icon-api" />
}

export function IconEditOutline16() {
  return <span data-testid="icon-edit" />
}

export function IconCodeOutline16() {
  return <span data-testid="icon-code" />
}

export function IconSparkle16() {
  return <span data-testid="icon-sparkle" />
}
