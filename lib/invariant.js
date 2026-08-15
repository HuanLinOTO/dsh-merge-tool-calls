//#region src/invariant.ts
const PACKAGE_NAME = "@huanlin/dsh-plugin-merge-tool-calls";
const name = "merge-tool-calls-invariant";
const inject = ["invariants"];
/** No runtime invariant: this package contributes client-only slot entries. */
const install = () => {};
/** Register package ownership with the invariant service. */
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));

//#endregion
export { apply, inject, name };