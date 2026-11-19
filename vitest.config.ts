import { defineConfig } from 'vitest/config';

// Pin the time zone so date rules ("today", local week keys) are tested the way the final will run (Vilnius).
process.env.TZ = 'Europe/Vilnius';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
