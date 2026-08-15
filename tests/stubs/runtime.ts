/** Test double for @deepseek-ai/dsh-client-runtime/client (see vitest.config.ts alias). */
export function conversationContextKey(kind: string, id: string): string {
  return `${kind.length}:${kind}${id}`
}
