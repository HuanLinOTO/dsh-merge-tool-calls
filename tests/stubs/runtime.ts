/** Test double for @deepseek-ai/dsh-client-runtime/client (see vitest.config.ts alias). */
export function conversationContextKey(kind: string, id: string): string {
  return `${kind.length}:${kind}${id}`
}

/** Resolve a possibly-relative path against a workspace root (test double). */
export function resolveWorkspacePath(root: string, path: string): string {
  if (/^([/\\]|[A-Za-z]:)/.test(path)) return path
  const separator = root.includes('\\') && !root.includes('/') ? '\\' : '/'
  return `${root.replace(/[/\\]+$/, '')}${separator}${path}`
}
