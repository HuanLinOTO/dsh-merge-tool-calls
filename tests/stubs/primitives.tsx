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

export function StateDot({ state }: { state: string }) {
  return <span data-testid="statedot" data-state={state} />
}

export function IconBrowseOutline16() {
  return <span data-testid="icon-browse" />
}

export function IconSearchOutline16() {
  return <span data-testid="icon-search" />
}
