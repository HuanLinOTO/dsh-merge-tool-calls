/**
 * The built-in tool universe this plugin shadows by default, plus the
 * variant-classification vocabulary mirroring ui-tool's tool-call model.
 *
 * The keyed `tool.call.toolview` slot dispatches on the exact wire tool name,
 * so a shadowed registration is needed per name (there is no wildcard). This
 * list names every shipped tool whose row belongs to the generic ToolRow
 * family — a variant title/icon plus read/search/diff/terminal/web card or
 * IN/OUT text — which the merged row reproduces faithfully.
 *
 * Deliberately excluded: tools with custom row cards this plugin does not
 * replicate (`skill`, `cordis_define`, and the live `cordis_run` /
 * `cordis_stop` / `cordis_undefine` rows), and `todo_write` /
 * `ask_user_question` whose summary formatting is tool-specific. They keep
 * their built-in rows unless the user names them in the `tools` config
 * explicitly.
 * @module
 */

/** Wire tool names merged by default (empty `tools` config = this list). */
export const ALL_TOOL_NAMES: readonly string[] = [
  // File tools (read/search/diff cards).
  'read', 'grep', 'glob', 'edit', 'write',
  // Shell tools (terminal card).
  'bash', 'pwsh',
  // Web tools (web card).
  'web_search', 'web_fetch',
  // Code tool (generic IN/OUT with the program body).
  'run_code',
  // Cordis inspection verbs (generic read-variant rows).
  'cordis_package_inspect', 'cordis_runtime_inspect',
]

/** Tool-row visual variant, mirroring ui-tool's ToolRowVariant. */
export type ToolVariant = 'search' | 'read' | 'bash' | 'write' | 'edit' | 'code' | 'others'

/** Figma row titles per variant (design literals, not translatable copy). */
export const VARIANT_TITLES: Record<ToolVariant, string> = {
  search: 'Search', read: 'Read', bash: 'Bash',
  write: 'Write', edit: 'Edit', code: 'Code', others: 'Tool call',
}

/**
 * Known tool name -> row variant (mirrors ui-tool's classification table,
 * minus the run-control verbs: their rows are custom and not shadowed).
 */
const TOOL_VARIANTS: Record<string, ToolVariant> = {
  bash: 'bash',
  pwsh: 'bash',
  read: 'read',
  web_fetch: 'read',
  web_search: 'search',
  grep: 'search',
  glob: 'search',
  write: 'write',
  edit: 'edit',
  run_code: 'code',
  cordis_package_inspect: 'read',
  cordis_runtime_inspect: 'read',
}

/** Tool-owned titles refining a generic row variant (mirrors ui-tool). */
export const TOOL_TITLES: Record<string, string> = {
  cordis_package_inspect: 'Inspect',
  cordis_runtime_inspect: 'Inspect',
  pwsh: 'Pwsh',
}

/** Classify a tool name into its row variant (mirrors ui-tool). */
export function classifyTool(toolName: string): ToolVariant {
  return TOOL_VARIANTS[toolName] ?? 'others'
}

/** The variant title a row shows, honoring tool-owned refinements. */
export function variantTitle(toolName: string): string {
  return TOOL_TITLES[toolName] ?? VARIANT_TITLES[classifyTool(toolName)]
}
