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
export declare const ALL_TOOL_NAMES: readonly string[];
/** Tool-row visual variant, mirroring ui-tool's ToolRowVariant. */
export type ToolVariant = 'search' | 'read' | 'bash' | 'write' | 'edit' | 'code' | 'others';
/** Figma row titles per variant (design literals, not translatable copy). */
export declare const VARIANT_TITLES: Record<ToolVariant, string>;
/** Tool-owned titles refining a generic row variant (mirrors ui-tool). */
export declare const TOOL_TITLES: Record<string, string>;
/** Classify a tool name into its row variant (mirrors ui-tool). */
export declare function classifyTool(toolName: string): ToolVariant;
/** The variant title a row shows, honoring tool-owned refinements. */
export declare function variantTitle(toolName: string): string;
