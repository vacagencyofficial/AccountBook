import { defineConfig } from 'vitest/config'

// 테스트는 브라우저 없이: 폰 DB는 fake-indexeddb, 서버(Supabase)는 PGlite로 흉내
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    testTimeout: 30000,
  },
})
