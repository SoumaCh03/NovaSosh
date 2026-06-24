import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'postgresql://nova:nova_dev_password@localhost:5432/nova_test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'test-secret-value-longer-than-32-characters-for-testing',
    },
  },
});
