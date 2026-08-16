[![dshfind](https://dshfind.com/api/badge/huanlinoto/dsh-merge-tool-calls?lang=zh)](https://dshfind.com/zh/plugins/huanlinoto/dsh-merge-tool-calls?ref=badge)

> 📌 本插件已收录于 [dshfind](https://dshfind.com/zh) 插件超市，点击上方徽章直达主页。

# dsh-plugin-merge-tool-calls

把 WebUI 会话流中**连续相邻**的同工具调用合并为一个「主卡片 + 紧凑子行」的树状展示，减少连续读文件/搜索/编辑/执行命令时多条卡片对流的占据。默认覆盖所有内置通用行工具（`read`/`grep`/`glob`/`edit`/`write`/`bash`/`pwsh`/`web_search`/`web_fetch`/`run_code`/`cordis_package_inspect`/`cordis_runtime_inspect`），也可配置白名单。

```
合并前：                         合并后：
[Read] foo ▸ 内容                 [Read] foo ▸ 内容（主卡片，行为同现状）
[Read] bar ▸ 内容                   └ bar（子行，点击展开 bar 的内容）
[Read] baz ▸ 内容                   └ baz（子行，点击展开 baz 的内容）
```

纯展示层合并：会话日志、模型可见数据、详情面板均不受影响；回放确定（合并结果是聊天快照的纯函数）。

## 工作原理

- 通过 keyed slot `tool.call.toolview` 的 shadow 机制（`priority: -1`，最低者渲染）接管工具的卡片；`tools: []` 时接管全部内置通用行工具（见 `src/client/tool-names.ts`），非空列表为显式白名单（任意 wire 名均可）。
- 组件经 `useSession` 读取聊天快照，用 `conversationContextKey('tool-call', callId)` 定位自身节点，在 `chat.order` 上前后扫描连续调用，按 `maxGroupSize` 分组。一组只合并**同名或同家族**调用：同名必合；已知家族（`grep`+`glob`、`bash`+`pwsh`、`read`+`web_fetch`）跨名合；未知工具名（variant `others`）仅与自身合，不相关的工具不会混进同一张卡。
- 组首座位渲染合并卡片；组内其余座位渲染 `null`，由注入的样式规则
  `[data-chat-flow-kind="tool-call"]:has([data-slot="tool.call.toolview"]:empty) { display: none; }`
  将其从流中收起（与内置 `.flowItem:empty` 语义一致；渲染器为每个 toolview 包一层
  `data-slot` 容器，故以该容器判空）。
- 主卡片镜像内置 ToolRow 的行面：按 variant 渲染标题/图标（Read/Search/Bash/Write/Edit/Code/`Tool call`，工具自定义标题如 `Pwsh`/`Inspect` 优先）、args 摘要（读→路径、搜索→query、bash→description/command、未知工具带 `工具名 ·` 前缀）、read/search/diff/terminal/web 卡片或 IN/OUT 文本；`read`/`write`/`edit` 的摘要是可点击文件链接。行状态、错误首行、bash 失败退出码转红点均与内置一致。
- 子行紧凑（20px 高），结构为主行的尾部（`sep 点 + 路径`）。对齐**运行时自动测量**：组件挂载后量取主行 sep 点相对卡片的偏移（并用 ResizeObserver 跟随字体/布局变化），以 `--mtc-sep-left` 自定义属性设置子行缩进——sep 点与主行 sep 点同列、路径与主行摘要同列，不依赖任何手工字体宽度常量，任意工具名均自动对齐。展开的子行卡片以负向 `calc` 抵消该缩进，左边缘与主卡片内容区对齐（占满卡片宽度，左侧不留白）。无可展开内容（如运行中的 read）的子行渲染为静态行。

## 配置

`cordis.patch.yml` 中的插件行 config：

| 字段 | 默认 | 说明 |
|------|------|------|
| `tools` | `[]`（全部） | 空数组 = 合并所有内置通用行工具（read/grep/glob/edit/write/bash/pwsh/web_search/web_fetch/run_code/cordis_package_inspect/cordis_runtime_inspect）；非空数组 = 显式白名单（任意 wire 名，如 `['read','todo_write']`） |
| `groupBy` | `adjacent` | `adjacent`：流中相邻即可合并；`step`：仅同 agent step |
| `maxGroupSize` | `8` | 每组最多合并数，超出部分自动另起新组 |

## 开发

前置：本机有 DSH checkout（`../dsh`，只读，仅类型引用）。

```sh
pnpm install            # 安装 registry 依赖（react/vitest/tsdown/cordis/schemastery…）
pnpm run typecheck      # tsc --noEmit；@deepseek-ai/* 类型来自已发布的 0.1.0-rc.6 devDeps
pnpm test               # vitest：纯逻辑 + jsdom 组件 + 注册形态
pnpm run build          # tsdown + tsc → lib/index.js、lib/invariant.js、lib/client.js、lib/types/
```

注意：`@deepseek-ai/*` 是宿主提供的 peer，开发期以 devDependencies 安装**已发布**的
`0.1.0-rc.6` 类型（其完整依赖图已发布，可直接安装）；测试期经
`vitest.config.ts` 的 alias 把 dsh 包指向 `tests/stubs/` 测试替身，组件测试无需宿主包。
Config 的 schemastery schema 使用 `@deepseek-ai/schemastery`（与 DSH 仓库同款，支持
`z.infer`）；host bundle 内联 schemastery（与范本 yet-another-subagent 一致），
profile 无需额外解析。

## 运行（挂载到 profile）

开发热更新（本地 clone，改源码重建 `lib/` 即生效）：

```sh
dsh plugin --profile web add link:D:\Projects\deepseek-harness\dsh-merge-tool-calls
```

分发安装（二选一）：

```sh
dsh plugin --profile web add "github:huanlinoto/dsh-merge-tool-calls"   # 源码分发
dsh plugin --profile web add "@huanlin/dsh-plugin-merge-tool-calls"     # npm registry 分发
```

然后由人类重启 `dsh web` 进程并硬刷新浏览器（`Ctrl+Shift+R`）。

## 检查

- `pnpm run typecheck && pnpm test && pnpm run build` 全绿；
- `git -C <dsh checkout> status` 干净（零源码 patch）；
- 浏览器验证：连续 3 个 `read` 显示为一个主卡片 + 两个 `└` 子行，点击子行展开内容；
  `grep`/`glob` 同理；`write`/`edit` 子行展开显示 diff 卡片、`bash`/`pwsh` 显示终端卡片、
  路径子行可点击在侧边栏预览；中间隔了其他节点的调用保持单卡片。

## 边界行为

- 组内运行中（running）调用只显示 args 摘要路径，结果到达后原地更新。
- error / interrupted 调用按内置语义着色（错误首行 / 警告状态点）；bash 非零退出码按内置语义转为红色错误点。
- `read`/`write`/`edit` 家族的主行/子行摘要是可点击文件链接（与内置行为一致）；grep/glob 的 `path` 参数是搜索目录而非文件，摘要保持纯文本，不会误开目录。
- 组被任何其他节点打断即断开；超过 `maxGroupSize` 的部分另起新组（不丢调用）。
- 非聊天节点场景（如被 dispatch 为子调用）回退为普通单行，绝不空白。
- 带自定义行卡片的工具（`skill`、`cordis_define`、`cordis_run`/`cordis_stop`/`cordis_undefine`，以及摘要格式特殊的 `todo_write`/`ask_user_question`）**不**默认接管，保持内置行；如需合并，用 `tools` 白名单显式加入（合并行按通用行面渲染）。
- 需要浏览器支持 `:has()`（Chrome 105+ / Safari 15.4+ / Firefox 121+）；不支持时仅退化为空行间距。
