import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Point the dsh runtime packages at local test doubles so specs never need the
// (private, host-provided) packages installed. Types still come from the dsh
// source checkout through tsconfig paths.
const stub = (name: string) => fileURLToPath(new URL(`./tests/stubs/${name}`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@deepseek-ai/dsh-client-ui-primitives': stub('primitives.tsx'),
      '@deepseek-ai/dsh-client-runtime/client': stub('runtime.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
  },
})
