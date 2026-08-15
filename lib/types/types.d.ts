/** Shared config surface of the merge-tool-calls plugin (host + client halves). */
/** How consecutive same-tool calls are grouped into one merged card. */
export type MergeGroupMode = 'adjacent' | 'step';
/** Plugin configuration; defaults live in the Schemastery schema and cordis.patch.yml. */
export interface MergeToolCallsConfig {
    /** Wire tool names whose consecutive calls merge (e.g. read, grep, glob). */
    readonly tools: readonly string[];
    /** `adjacent`: any consecutive run in the chat flow; `step`: only within one agent step. */
    readonly groupBy: MergeGroupMode;
    /** Max calls per merged group; the run is truncated and the excess starts a new group. */
    readonly maxGroupSize: number;
}
/** Runtime defaults applied when a half receives no config (defensive only). */
export declare const DEFAULT_MERGE_CONFIG: MergeToolCallsConfig;
