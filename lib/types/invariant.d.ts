/** Package invariant companion for dsh-plugin-merge-tool-calls. */
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants';
export declare const name = "merge-tool-calls-invariant";
export declare const inject: string[];
interface InvariantContext {
    invariants: {
        register: (name: string, installer: InvariantInstaller) => () => void;
    };
}
/** Register package ownership with the invariant service. */
export declare const apply: (ctx: InvariantContext) => Promise<() => void>;
export {};
