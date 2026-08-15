/** Product copy for the merged tool-call rows. */
export const zh = {
  running: '进行中',
  failed: '失败',
  stopped: '已中断',
  expand: '展开',
  collapse: '折叠',
  more: '+{n}',
  showLess: '收起其余',
  mergedCount: '已合并 {n} 次调用',
} satisfies Record<string, string>

export type MergeToolCallsKey = keyof typeof zh

export const en = {
  running: 'Running',
  failed: 'Failed',
  stopped: 'Interrupted',
  expand: 'Expand',
  collapse: 'Collapse',
  more: '+{n}',
  showLess: 'Show fewer',
  mergedCount: '{n} calls merged',
} satisfies Record<MergeToolCallsKey, string>

export const NS = 'merge-tool-calls'
