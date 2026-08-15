window.__ModuleLoader__.load({ id: "@huanlin/dsh-plugin-merge-tool-calls", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let __deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
__deepseek_ai_dsh_client_ui_primitives = __toESM(__deepseek_ai_dsh_client_ui_primitives);
let __deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
__deepseek_ai_dsh_client_runtime_client = __toESM(__deepseek_ai_dsh_client_runtime_client);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);

//#region src/types.ts
/** Runtime defaults applied when a half receives no config (defensive only). */
const DEFAULT_MERGE_CONFIG = {
	tools: [],
	groupBy: "adjacent",
	maxGroupSize: 8
};

//#endregion
//#region src/client/locales.ts
/** Product copy for the merged tool-call rows. */
const zh = {
	running: "进行中",
	failed: "失败",
	stopped: "已中断",
	expand: "展开",
	collapse: "折叠",
	more: "+{n}",
	showLess: "收起其余",
	mergedCount: "已合并 {n} 次调用",
	"terminal.signal": "信号 {signal}",
	"terminal.exitCode": "退出码 {code}",
	"terminal.running": "运行中",
	"terminal.failed": "失败",
	"terminal.done": "已完成",
	"terminal.copy": "复制",
	"terminal.copied": "已复制",
	"terminal.noOutput": "无输出",
	"terminal.collapseAria": "收起输出",
	"terminal.collapse": "折叠",
	"terminal.expandAria": "展开其余 {n} 行输出",
	"terminal.expandRest": "… 其余 {n} 行"
};
const en = {
	running: "Running",
	failed: "Failed",
	stopped: "Interrupted",
	expand: "Expand",
	collapse: "Collapse",
	more: "+{n}",
	showLess: "Show fewer",
	mergedCount: "{n} calls merged",
	"terminal.signal": "signal {signal}",
	"terminal.exitCode": "exit code {code}",
	"terminal.running": "Running",
	"terminal.failed": "Failed",
	"terminal.done": "Done",
	"terminal.copy": "Copy",
	"terminal.copied": "Copied",
	"terminal.noOutput": "No output",
	"terminal.collapseAria": "Collapse output",
	"terminal.collapse": "Collapse",
	"terminal.expandAria": "Expand the remaining {n} output lines",
	"terminal.expandRest": "… {n} more lines"
};
const NS = "merge-tool-calls";

//#endregion
//#region src/client/tool-names.ts
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
const ALL_TOOL_NAMES = [
	"read",
	"grep",
	"glob",
	"edit",
	"write",
	"bash",
	"pwsh",
	"web_search",
	"web_fetch",
	"run_code",
	"cordis_package_inspect",
	"cordis_runtime_inspect"
];
/** Figma row titles per variant (design literals, not translatable copy). */
const VARIANT_TITLES = {
	search: "Search",
	read: "Read",
	bash: "Bash",
	write: "Write",
	edit: "Edit",
	code: "Code",
	others: "Tool call"
};
/**
* Known tool name -> row variant (mirrors ui-tool's classification table,
* minus the run-control verbs: their rows are custom and not shadowed).
*/
const TOOL_VARIANTS = {
	bash: "bash",
	pwsh: "bash",
	read: "read",
	web_fetch: "read",
	web_search: "search",
	grep: "search",
	glob: "search",
	write: "write",
	edit: "edit",
	run_code: "code",
	cordis_package_inspect: "read",
	cordis_runtime_inspect: "read"
};
/** Tool-owned titles refining a generic row variant (mirrors ui-tool). */
const TOOL_TITLES = {
	cordis_package_inspect: "Inspect",
	cordis_runtime_inspect: "Inspect",
	pwsh: "Pwsh"
};
/** Classify a tool name into its row variant (mirrors ui-tool). */
function classifyTool(toolName) {
	return TOOL_VARIANTS[toolName] ?? "others";
}

//#endregion
//#region src/client/card-model.ts
/** True when a settled terminal card reports a failing exit (mirrors ui-tool). */
function terminalFailed(model) {
	const { exitCode, signal, running } = model.card;
	return running !== true && (exitCode !== void 0 && exitCode !== 0 || signal !== void 0);
}
/**
* Flatten a settled result's content blocks to display text.
* @param node - settled result node.
* @returns joined text (may be empty).
*/
function resultText(node) {
	const parts = [];
	for (const block of node.content) if (block.type === "text") parts.push(block.text);
	else parts.push(JSON.stringify(block));
	if (parts.length === 0 && node.error !== void 0) parts.push(`${node.error.name}: ${node.error.code}`);
	return parts.join("\n");
}
function firstLine(text) {
	const nl = text.indexOf("\n");
	return nl === -1 ? text : text.slice(0, nl);
}
/** Strip the workspace root from a workspace-rooted absolute path (display only). */
function relativizeToCwd(text, cwd) {
	if (cwd === void 0 || cwd === "") return text;
	const root = cwd.replace(/[/\\]+$/, "");
	if (text.startsWith(`${root}/`) || text.startsWith(`${root}\\`)) return text.slice(root.length + 1);
	return text;
}
function parseArgs(argsRaw) {
	try {
		const parsed = JSON.parse(argsRaw);
		return typeof parsed === "object" && parsed !== null ? parsed : void 0;
	} catch {
		return;
	}
}
function pickString(args, keys) {
	for (const key of keys) {
		const value = args[key];
		if (typeof value === "string" && value !== "") return value;
	}
}
/** Summary key preference per row variant (args-derived, mirrors ui-tool). */
const SUMMARY_KEYS = {
	bash: ["description", "command"],
	read: [
		"path",
		"file_path",
		"url"
	],
	search: [
		"query",
		"pattern",
		"url"
	],
	write: ["path", "file_path"],
	edit: ["path", "file_path"],
	code: ["description"],
	others: []
};
function deriveSummary(variant, argsRaw) {
	const parsed = parseArgs(argsRaw);
	if (parsed === void 0) return firstLine(argsRaw);
	const picked = pickString(parsed, SUMMARY_KEYS[variant]);
	if (picked !== void 0) return firstLine(picked);
	for (const value of Object.values(parsed)) if (typeof value === "string" && value !== "") return firstLine(value);
	return firstLine(argsRaw);
}
/** Path keys only — never `url` (web_fetch lands on the read variant). */
const FILE_PATH_KEYS = ["path", "file_path"];
/** File-tool variants whose summary may be an openable workspace path. */
const FILE_PATH_VARIANTS = new Set([
	"read",
	"write",
	"edit"
]);
function deriveFilePath(variant, argsRaw) {
	if (!FILE_PATH_VARIANTS.has(variant)) return void 0;
	const parsed = parseArgs(argsRaw);
	if (parsed === void 0) return void 0;
	return pickString(parsed, FILE_PATH_KEYS)?.split("\n")[0];
}
function deriveBody(variant, argsRaw) {
	if (argsRaw === "") return null;
	const parsed = parseArgs(argsRaw);
	if (parsed === void 0) return argsRaw;
	if (variant === "code") {
		const code = parsed.code;
		if (typeof code === "string" && code !== "") return code;
	}
	return JSON.stringify(parsed, null, 2);
}
/** Derive the row model for one call of a grouped tool. */
function callRowModel(toolName, block, cwd) {
	const done = "kind" in block;
	const argsRaw = (done ? block.call?.argsRaw : block.argsRaw) ?? "";
	const state = !done ? "running" : block.error?.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
	const variant = classifyTool(toolName);
	const terminal = terminalCardOf(block, cwd);
	const read = readCardOf(block, cwd);
	const diff = diffCardOf(block);
	const search = searchCardOf(block);
	const web = webCardOf(block);
	const base = argsRaw === "" ? block.callId : relativizeToCwd(deriveSummary(variant, argsRaw), cwd);
	const toolTitle = TOOL_TITLES[toolName];
	const argsSummary = variant === "others" && toolName !== "" && toolTitle === void 0 ? `${toolName} · ${base}` : base;
	const filePath = deriveFilePath(variant, argsRaw);
	const output = done ? resultText(block) || null : null;
	const errorSummary = state === "error" && output !== null ? firstLine(output) : null;
	const summary = terminal?.description ?? search?.title ?? argsSummary;
	const body = filePath !== void 0 ? null : deriveBody(variant, argsRaw);
	const finalState = state === "ok" && terminal !== null && terminalFailed(terminal) ? "error" : state;
	const expandable = terminal !== null || diff !== null || read !== null || search !== null || web !== null || body !== null || output !== null;
	return {
		state: finalState,
		variant,
		title: toolTitle ?? VARIANT_TITLES[variant],
		summary,
		body,
		output,
		errorSummary,
		filePath,
		expandable,
		terminal,
		diff,
		read,
		search,
		web
	};
}
/** Read-card derivation, or null when this call is not a read card (mirrors ui-tool). */
function readCardOf(block, cwd) {
	if (!("kind" in block)) return null;
	const result = block.resultView?.card === "read" ? block.resultView : null;
	if (result === null) return null;
	if (!Array.isArray(result.lines)) return null;
	const lines = result.lines.filter((line) => typeof line === "object" && line !== null && typeof line.number === "number" && typeof line.text === "string").map((line) => ({
		number: line.number,
		text: line.text
	}));
	return {
		label: result.title ?? relativizeToCwd(result.path, cwd),
		lines,
		totalLines: typeof result.totalLines === "number" ? result.totalLines : lines.length,
		lang: typeof result.lang === "string" ? result.lang : void 0
	};
}
function isValidFiles(files) {
	return Array.isArray(files) && files.every((file) => typeof file === "object" && file !== null && typeof file.path === "string" && Array.isArray(file.matches) && file.matches.every((match) => typeof match === "object" && match !== null && typeof match.lineNumber === "number" && typeof match.line === "string"));
}
function flattenContent(content) {
	const text = content.filter((block) => block.type === "text" && typeof block.text === "string").map((block) => block.text).join("\n");
	return text === "" ? void 0 : text;
}
/** Search-card derivation, or null when this call is not a search card (mirrors ui-tool). */
function searchCardOf(block) {
	if (!("kind" in block)) return null;
	const result = block.resultView?.card === "search" ? block.resultView : null;
	if (result === null) return null;
	const common = {
		truncated: result.truncated,
		total: result.total
	};
	const recovery = result.truncated ? flattenContent(block.content) : void 0;
	if (result.shape === "matches") {
		if (!isValidFiles(result.files)) return null;
		return {
			title: result.title,
			recovery,
			card: {
				kind: "matches",
				files: result.files,
				...common
			}
		};
	}
	if (result.shape !== "paths") return null;
	if (!Array.isArray(result.paths) || !result.paths.every((path) => typeof path === "string")) return null;
	return {
		title: result.title,
		recovery,
		card: {
			kind: "paths",
			paths: result.paths,
			...common
		}
	};
}
/** Narrow a wire `card:'diff'` view's `diffs` to well-formed hunks (mirrors ui-tool). */
function narrowDiffs(diffs) {
	if (!Array.isArray(diffs) || diffs.length === 0) return null;
	const out = [];
	for (const hunk of diffs) {
		if (typeof hunk !== "object" || hunk === null) return null;
		const { path, oldText, newText } = hunk;
		if (typeof path !== "string") return null;
		if (oldText !== null && typeof oldText !== "string") return null;
		if (typeof newText !== "string") return null;
		out.push({
			path,
			oldText,
			newText
		});
	}
	return out;
}
/** Diff-card derivation, or null when this call is not a diff card (mirrors ui-tool). */
function diffCardOf(block) {
	if (!("kind" in block)) {
		const call = block.callView?.card === "diff" ? block.callView : null;
		const diffs$1 = call === null ? null : narrowDiffs(call.diffs);
		return diffs$1 === null ? null : { card: { diffs: diffs$1 } };
	}
	const result = block.resultView?.card === "diff" ? block.resultView : null;
	const diffs = result === null ? null : narrowDiffs(result.diffs);
	return diffs === null ? null : { card: { diffs } };
}
/**
* Resolve a terminal view's working directory the way the render-intent
* contract assigns it: an absolute path is used as-is, a relative one joins
* under the session workspace, and an omitted one IS the session workspace.
* @param viewCwd - the cwd the terminal call view carries, if any.
* @param sessionCwd - the session workspace root, if the caller knows it.
* @returns the working directory for the prompt label, or undefined.
*/
function resolveTerminalCwd(viewCwd, sessionCwd) {
	if (viewCwd === void 0 || viewCwd === "") return sessionCwd;
	if (sessionCwd === void 0 || sessionCwd === "") return viewCwd;
	return (0, __deepseek_ai_dsh_client_runtime_client.resolveWorkspacePath)(sessionCwd, viewCwd);
}
/** Terminal-card derivation, or null when this call is not a terminal card (mirrors ui-tool). */
function terminalCardOf(block, sessionCwd) {
	const call = block.callView?.card === "terminal" ? block.callView : null;
	if (!("kind" in block)) return call === null ? null : {
		description: call.description,
		card: {
			command: call.title,
			cwd: resolveTerminalCwd(call.cwd, sessionCwd),
			output: void 0,
			exitCode: void 0,
			signal: void 0,
			running: true
		}
	};
	const result = block.resultView?.card === "terminal" ? block.resultView : null;
	if (result === null) return null;
	return {
		description: call?.description,
		card: {
			command: result.title ?? call?.title ?? "",
			cwd: call === null ? void 0 : resolveTerminalCwd(call.cwd, sessionCwd),
			output: result.output,
			exitCode: result.exitCode,
			signal: result.signal,
			running: false
		}
	};
}
/** Web-card derivation, or null when this call is not a web card (mirrors ui-tool). */
function webCardOf(block) {
	if (!("kind" in block)) return null;
	const result = block.resultView;
	if (result?.card !== "web") return null;
	if (result.kind === "search") return {
		kind: "search",
		answer: result.answer,
		sources: result.sources.map((source) => ({
			url: source.url,
			title: source.title,
			snippet: source.snippet,
			publishedAt: source.publishedAt
		})),
		truncated: result.truncated
	};
	if (result.kind === "fetch") return {
		kind: "fetch",
		url: result.url,
		statusCode: result.statusCode,
		truncated: result.truncated
	};
	return null;
}

//#endregion
//#region src/client/merge-run.ts
/** Tool-call node kind registered by ui-conversation's built-in tool definition. */
const TOOL_CALL_KIND = "tool-call";
/** Extract a root call block from any chat node, when it is a tool-call node. */
function toolRootOf(node) {
	if (node.kind !== TOOL_CALL_KIND) return null;
	const root = node.data.root;
	return typeof root === "object" && root !== null ? root : null;
}
/** The wire tool name of a call in either lifecycle form (mirrors ui-tool). */
function callNameOf(block) {
	return "kind" in block ? block.call?.name ?? "" : block.name;
}
/** Whether the call's wire name is one of the grouped tools (empty = all). */
function isGroupedTool(name, tools) {
	return tools.length === 0 || tools.includes(name);
}
/** Step identity of a node's location; undefined when the node is not step-bound. */
function stepIdOf(node) {
	const location = node.location;
	return location.kind === "step" ? `${location.turn.turn}:${location.step.step}` : void 0;
}
/**
* Compute the merged group this call belongs to.
*
* 1. Locates this call's node in the chat order; null when it is not a chat
*    tool-call node (e.g. a read dispatched as a subcall).
* 2. Walks backward/forward to the maximal consecutive run containing it. A
*    call continues the run when it is a grouped tool AND same-tool-same-run:
*    the identical wire name, or a sibling of the same known variant family
*    (grep+glob, bash+pwsh, read+web_fetch…). Unknown names (variant
*    `others`) only merge with themselves, so unrelated tools never share a
*    card (`adjacent`: any consecutive run; `step`: same agent step as this
*    call).
* 3. Partitions the run into `maxGroupSize`-sized groups; this call is the
*    group's first only when it heads one of those partitions. Truncation
*    therefore never orphans a call: the excess starts its own group.
*
* @param order - chat node key order.
* @param nodes - chat node store.
* @param myCallId - the call id of the seat asking about itself.
* @param tools - grouped wire tool names; empty means every tool.
* @param groupBy - grouping mode.
* @param maxGroupSize - per-group cap.
* @returns the group partition, or null when the call is not a chat tool-call node.
*/
function readRun(order, nodes, myCallId, tools, groupBy, maxGroupSize) {
	const myKey = (0, __deepseek_ai_dsh_client_runtime_client.conversationContextKey)(TOOL_CALL_KIND, myCallId);
	const myIndex = order.indexOf(myKey);
	if (myIndex < 0) return null;
	const myRoot = rootAtNode(order, nodes, myIndex);
	if (myRoot === null) return null;
	const myName = callNameOf(myRoot);
	const myVariant = classifyTool(myName);
	const size = Math.max(1, maxGroupSize);
	const rootAt = (index) => rootAtNode(order, nodes, index);
	const myStep = groupBy === "step" ? stepIdOfNodeAt(order, nodes, myIndex) : void 0;
	const inGroup = (index) => {
		const root = rootAt(index);
		if (root === null || !isGroupedTool(callNameOf(root), tools)) return false;
		const name = callNameOf(root);
		if (name !== myName) {
			if (myVariant === "others" || classifyTool(name) !== myVariant) return false;
		}
		if (groupBy !== "step") return true;
		return myStep !== void 0 && stepIdOfNodeAt(order, nodes, index) === myStep;
	};
	let start = myIndex;
	while (start > 0 && inGroup(start - 1)) start--;
	let end = myIndex;
	while (end < order.length - 1 && inGroup(end + 1)) end++;
	const groupStart = start + Math.floor((myIndex - start) / size) * size;
	const groupEnd = Math.min(groupStart + size, end + 1);
	const blocks = [];
	for (let index = groupStart; index < groupEnd; index++) {
		const root = rootAt(index);
		if (root !== null) blocks.push(root);
	}
	return {
		isFirst: myIndex === groupStart,
		blocks
	};
}
function rootAtNode(order, nodes, index) {
	const key = order[index];
	const node = key === void 0 ? void 0 : nodes.get(key);
	return node === void 0 ? null : toolRootOf(node);
}
function stepIdOfNodeAt(order, nodes, index) {
	const key = order[index];
	const node = key === void 0 ? void 0 : nodes.get(key);
	return node === void 0 ? void 0 : stepIdOf(node);
}

//#endregion
//#region src/client/rows.tsx
/** Chat rows show a capped card; the details panel stays the full-height surface. */
const CHAT_READ_MAX_LINES = 8;
const CHAT_SEARCH_MAX_LINES = 8;
const CHAT_DIFF_MAX_LINES = 8;
/** Variant leading icons (figma table); all glyphs render at 14 inside the 16px leading box. */
const VARIANT_ICONS = {
	search: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 }),
	read: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 }),
	bash: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconApiOutline14, { size: 14 }),
	write: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 }),
	edit: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 }),
	code: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 }),
	others: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 14 })
};
/** Leading-slot state substitution, mirroring the shipped row. */
function leadingFor(state, icon) {
	switch (state) {
		case "error": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" });
		case "stopped": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "warning" });
		default: return icon;
	}
}
/** Visually hidden run-state label (the StateDot and sweep are colour-only). */
function stateStatus(state, t) {
	switch (state) {
		case "running": return t("running");
		case "error": return t("failed");
		case "stopped": return t("stopped");
		default: return null;
	}
}
/** TerminalBlock display copy from the plugin's own dictionary. */
function terminalLabels(t) {
	return {
		signal: (signal) => t("terminal.signal", { signal }),
		exitCode: (code) => t("terminal.exitCode", { code }),
		running: t("terminal.running"),
		failed: t("terminal.failed"),
		done: t("terminal.done"),
		copy: t("terminal.copy"),
		copied: t("terminal.copied"),
		noOutput: t("terminal.noOutput"),
		collapseAria: t("terminal.collapseAria"),
		collapse: t("terminal.collapse"),
		expandAria: (hidden) => t("terminal.expandAria", { n: hidden }),
		expand: (hidden) => t("terminal.expandRest", { n: hidden })
	};
}
/** One call's expanded-body card, mirroring the built-in ToolRow body. */
function CardBody({ model, t }) {
	if (model.terminal !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.TerminalBlock, {
		...model.terminal.card,
		maxLines: Infinity,
		labels: terminalLabels(t)
	});
	if (model.diff !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.DiffBlock, {
		...model.diff.card,
		maxLines: CHAT_DIFF_MAX_LINES
	});
	if (model.read !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.ReadBlock, {
		...model.read,
		maxLines: CHAT_READ_MAX_LINES
	});
	if (model.search !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.SearchBlock, {
		...model.search.card,
		maxLines: CHAT_SEARCH_MAX_LINES
	}), model.search.recovery !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: "mtc-recovery",
		children: model.search.recovery
	})] });
	if (model.web !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.WebBlock, { ...model.web });
	const hasBody = model.body !== null;
	const hasOutput = model.output !== null;
	if (!hasBody && !hasOutput) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "mtc-io-card",
		children: [
			hasBody && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mtc-io-section",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-io-label",
					children: "IN"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-io-text",
					children: model.body
				})]
			}),
			hasBody && hasOutput && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "mtc-io-divider",
				"aria-hidden": true
			}),
			hasOutput && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mtc-io-section",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-io-label",
					children: "OUT"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-io-text",
					"data-error": model.state === "error" || void 0,
					children: model.output
				})]
			})
		]
	});
}
/** The run's main card: the first call's full row (chrome + expandable card). */
const RowCard = (0, react.memo)(function RowCard$1({ toolName, block, cwd, openFile, inspect, t, mergedCount }) {
	const model = callRowModel(toolName, block, cwd);
	const [expanded, setExpanded] = (0, react.useState)(false);
	const open = expanded && model.expandable;
	const status = stateStatus(model.state, t);
	const failureLine = model.state === "error" ? model.errorSummary ?? null : null;
	const summaryText = failureLine ?? model.summary;
	const suffix = failureLine === null && mergedCount > 0 ? t("more", { n: String(mergedCount) }) : null;
	const fileLink = model.filePath !== void 0 && openFile !== void 0 && failureLine === null;
	const openFileClick = (event) => {
		event.stopPropagation();
		if (model.filePath !== void 0) openFile(model.filePath);
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "mtc-row",
		"data-state": model.state,
		"data-variant": model.variant,
		children: [status !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "mtc-visually-hidden",
			children: status
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
			rowClassName: "mtc-title-row",
			titleClassName: "mtc-title",
			leadingClassName: "mtc-leading",
			chevronClassName: "mtc-chevron",
			icon: leadingFor(model.state, VARIANT_ICONS[model.variant]),
			title: model.title,
			open,
			expandable: model.expandable,
			expandOnRowClick: true,
			keepContentWhenOpen: true,
			onToggle: () => {
				setExpanded((value) => !value);
			},
			collapsedContent: summaryText !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-sep",
					"aria-hidden": true
				}),
				fileLink ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mtc-summary-link",
					onClick: openFileClick,
					children: summaryText
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-summary",
					children: summaryText
				}),
				suffix !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-summary-suffix",
					children: suffix
				})
			] }),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mtc-card-body",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBody, {
					model,
					t
				}), inspect !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mtc-inspect",
					onClick: inspect,
					children: "Inspect"
				})]
			})
		})]
	});
});
/**
* One compact continuation row: the main row's tail structure ([sep dot][path]).
* An expandable call toggles the inline content card on click (mirroring the
* main row's whole-row disclosure); a read/write/edit-family path additionally
* renders as an open-file link (the sidebar preview) that stops propagation,
* exactly like the main row's summary link.
*/
const ChildRow = (0, react.memo)(function ChildRow$1({ toolName, block, cwd, openFile, t }) {
	const model = callRowModel(toolName, block, cwd);
	const [open, setOpen] = (0, react.useState)(false);
	const stateLabel = stateStatus(model.state, t);
	const expandable = model.expandable;
	const toggle = () => {
		setOpen((value) => !value);
	};
	const openFileClick = (event) => {
		event.stopPropagation();
		if (model.filePath !== void 0) openFile(model.filePath);
	};
	const onRowKeyDown = (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			toggle();
		}
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "mtc-child",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "mtc-child-row",
			"data-open": expandable && open || void 0,
			"data-static": expandable ? void 0 : true,
			role: expandable ? "button" : void 0,
			tabIndex: expandable ? 0 : void 0,
			"aria-expanded": expandable ? open : void 0,
			onClick: expandable ? toggle : void 0,
			onKeyDown: expandable ? onRowKeyDown : void 0,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-sep",
					"aria-hidden": true
				}),
				model.filePath !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mtc-child-path-link",
					onClick: openFileClick,
					children: model.summary
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-child-path",
					children: model.summary
				}),
				stateLabel !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mtc-child-state",
					"data-error": model.state === "error" || void 0,
					children: stateLabel
				})
			]
		}), expandable && open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "mtc-child-body",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardBody, {
				model,
				t
			})
		})]
	});
});
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
function MergedToolRow({ callId, toolName, block, cwd, openFile, inspect, t, cfg, useSession }) {
	const run = useSession((snapshot) => readRun(snapshot.chat.order, snapshot.chat.nodes, callId, cfg.tools, cfg.groupBy, cfg.maxGroupSize));
	const rootRef = (0, react.useRef)(null);
	/** Main separator dot's left offset from the card root; null before first measure. */
	const [sepLeft, setSepLeft] = (0, react.useState)(null);
	(0, react.useLayoutEffect)(() => {
		const root = rootRef.current;
		if (root === null) return;
		const sep = root.querySelector(".mtc-row .mtc-sep");
		if (sep === null) return;
		const measure = () => {
			setSepLeft(Math.round(sep.getBoundingClientRect().left - root.getBoundingClientRect().left));
		};
		measure();
		const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
		observer?.observe(root);
		return () => {
			observer?.disconnect();
		};
	}, [run === null ? null : run.blocks[0]?.callId ?? null]);
	if (run === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowCard, {
		toolName,
		block,
		cwd,
		openFile,
		inspect,
		t,
		mergedCount: 0
	});
	if (!run.isFirst) return null;
	const hasChildren = run.blocks.length > 1;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "mtc-root",
		"data-tool": toolName,
		ref: rootRef,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowCard, {
			toolName,
			block: run.blocks[0] ?? block,
			cwd,
			openFile,
			inspect,
			t,
			mergedCount: run.blocks.length - 1
		}), hasChildren && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "mtc-children",
			style: sepLeft === null ? void 0 : { ["--mtc-sep-left"]: `${sepLeft}px` },
			children: run.blocks.slice(1).map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChildRow, {
				toolName,
				block: child,
				cwd,
				openFile,
				t
			}, child.callId))
		})]
	});
}

//#endregion
//#region src/client/styles.ts
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
const CSS = `
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
/* IN/OUT text card for calls without a card primitive (mirrors ToolRow). */
.mtc-io-card {
  display: flex; flex-direction: column; min-width: 0;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px;
  background: var(--dsw-alias-bg-base);
}
.mtc-io-section { display: flex; gap: 10px; padding: 8px 12px; min-width: 0; }
.mtc-io-label {
  flex: none; font-size: 11px; line-height: 16px; font-weight: 600;
  color: var(--dsw-alias-label-tertiary);
}
.mtc-io-text {
  flex: 1 1 auto; min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere;
  font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary);
}
.mtc-io-text[data-error] { color: var(--dsw-alias-state-error-primary); }
.mtc-io-divider { height: 1px; background: var(--dsw-alias-border-l2); }
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
.mtc-child-row[data-static] { cursor: default; }
.mtc-child-row[data-static]:hover { background: none; color: var(--dsw-alias-label-secondary); }
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
`;
/** Install the stylesheet and return its disposer. */
function installStyles() {
	const style = document.createElement("style");
	style.setAttribute("data-merge-tool-calls-style", "");
	style.textContent = CSS;
	document.head.appendChild(style);
	return () => {
		style.remove();
	};
}

//#endregion
//#region src/client/index.ts
/** Required services: the slot registry (toolview shadowing) and locale. */
const inject = ["slots", "locale"];
/**
* Register one shadowed toolview per grouped tool.
* @param ctx - client root context.
* @param config - row config; defaults apply when the loader passes none.
*/
function apply(ctx, config = {}) {
	const cfg = {
		...DEFAULT_MERGE_CONFIG,
		...config
	};
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "merge-tool-calls: dictionaries");
	ctx.effect(installStyles, "merge-tool-calls: styles");
	const toolNames = cfg.tools.length === 0 ? ALL_TOOL_NAMES : [...new Set(cfg.tools)];
	for (const tool of toolNames) ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
		name: "tool.call.toolview",
		key: tool,
		priority: -1,
		locale: NS,
		inject: () => ({ cfg })
	}, MergedToolRow));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });
//# sourceMappingURL=client.js.map