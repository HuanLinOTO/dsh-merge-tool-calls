/**
 * One scoped stylesheet injected for the lifetime of the client activation.
 *
 * Two jobs:
 *  1. The empty-seat collapse rule: the shadowed toolview renders `null` for
 *     every non-first call of a merged run. The built-in `ToolCallTree` still
 *     wraps that null in its `.callRow` div, and the renderer wraps every
 *     toolview in an empty `<div data-slot="tool.call.toolview">` (display:
 *     contents), so the seat's `.flowItem` is never `:empty` itself and the
 *     built-in `.flowItem:empty { display:none }` rule does not fire. This
 *     rule extends the same intent ("a renderer may decline its row") to a
 *     tool seat whose toolview rendered nothing.
 *  2. The plugin's own `.mtc-*` chrome for the merged card and its child rows.
 *
 * All colors come from the shared `--dsw-*` tokens (never literals).
 */
export const CSS = `
/* A tool-call seat whose toolview declined to render (merged-run continuation
   calls) must not consume the flow column's gap. The empty toolview slot
   wrapper is the decline signal; the callRow around it always exists. */
[data-chat-flow-kind="tool-call"]:has([data-slot="tool.call.toolview"]:empty) { display: none; }

.mtc-root { display: flex; flex-direction: column; min-width: 0; }
.mtc-row { display: flex; flex-direction: column; min-width: 0; }
.mtc-row[data-state='running'] .mtc-title-row { position: relative; overflow: hidden; }
.mtc-row[data-state='running'] .mtc-title-row::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 300px;
  background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);
  animation: dsh-mtc-sweep 2.6s ease-out infinite;
  pointer-events: none;
}
@keyframes dsh-mtc-sweep {
  0% { left: -300px; }
  90%, 100% { left: 100%; }
}

.mtc-title { font-weight: 400; }
.mtc-sep { flex: none; width: 2px; height: 2px; border-radius: 1px; margin: 0 8px; background: var(--dsw-alias-label-caption); }
.mtc-summary {
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 14px; line-height: 24px; color: var(--dsw-alias-label-tertiary);
}
.mtc-summary-link {
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin: 0; padding: 0; border: none; background: none; font: inherit; text-align: left;
  font-size: 14px; line-height: 24px; color: var(--dsw-alias-label-secondary);
  text-decoration: underline; text-decoration-color: var(--dsw-alias-label-quaternary);
  text-underline-offset: 3px; cursor: pointer;
}
.mtc-summary-link:hover { color: var(--dsw-alias-label-primary); text-decoration-color: currentColor; }
.mtc-summary-error { color: var(--dsw-alias-state-error-primary); }
.mtc-summary-suffix { flex: none; margin-left: 4px; white-space: nowrap; font-size: 14px; line-height: 24px; color: var(--dsw-alias-label-tertiary); }

.mtc-card-body { margin: 4px 0 4px 4px; min-width: 0; }
.mtc-recovery { margin: 4px 0 4px 4px; white-space: pre-wrap; overflow-wrap: anywhere; font: var(--dsw-font-xs-13); color: var(--dsw-alias-label-tertiary); }
.mtc-inspect {
  display: inline-flex; align-self: flex-start; align-items: center; gap: 4px;
  margin: 4px 0 2px 4px; padding: 2px 8px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px;
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary);
  font-size: 11px; line-height: 16px; cursor: pointer;
  opacity: 0; transition: opacity 100ms ease;
}
.mtc-root:hover .mtc-inspect, .mtc-inspect:focus-visible { opacity: 1; }
.mtc-inspect:hover { background: var(--dsw-alias-interactive-bg-hover-solid); color: var(--dsw-alias-label-primary); }

/* Compact child rows: each is the main row's tail structure — [sep dot][path].
   The dot/path columns are set at runtime by the component (it measures the
   main row's sep offset and sets the --mtc-sep-left custom property on the
   children block), so this is only the pre-measure fallback. */
.mtc-children { display: flex; flex-direction: column; gap: 1px; margin: 2px 0 2px var(--mtc-sep-left, 61px); }
.mtc-child { display: flex; flex-direction: column; min-width: 0; }
.mtc-child-row {
  display: flex; align-items: center; gap: 0; min-width: 0; height: 20px;
  margin: 0; padding: 0; border: 0; border-radius: 4px; background: none;
  font: inherit; text-align: left; color: var(--dsw-alias-label-secondary); cursor: pointer;
}
.mtc-child-row:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.mtc-child-row .mtc-sep { margin: 0 8px 0 0; }
.mtc-child-path {
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 14px; line-height: 20px;
}
/* Read-family child paths are open-file links (sidebar preview), same affordance
   as the main row's summary link. */
.mtc-child-path-link {
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin: 0; padding: 0; border: none; background: none; font: inherit; text-align: left;
  font-size: 14px; line-height: 20px; color: var(--dsw-alias-label-secondary);
  text-decoration: underline; text-decoration-color: var(--dsw-alias-label-quaternary);
  text-underline-offset: 3px; cursor: pointer;
}
.mtc-child-path-link:hover { color: var(--dsw-alias-label-primary); text-decoration-color: currentColor; }
.mtc-child-state { flex: none; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.mtc-child-state[data-error] { color: var(--dsw-alias-state-error-primary); }
/* The expanded child card must not inherit the children block's sep indent:
   pull its left edge back to the main card body's column (root + 4px) so the
   card spans the card width instead of leaving a blank gutter on its left. */
.mtc-child-body { margin: 2px 0 2px calc(4px - var(--mtc-sep-left, 61px)); min-width: 0; }

.mtc-visually-hidden {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap;
}
`

/** Install the stylesheet and return its disposer. */
export function installStyles(): () => void {
  const style = document.createElement('style')
  style.setAttribute('data-merge-tool-calls-style', '')
  style.textContent = CSS
  document.head.appendChild(style)
  return () => { style.remove() }
}
