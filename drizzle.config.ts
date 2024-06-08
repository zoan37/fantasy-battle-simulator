import '@/drizzle/envConfig';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema.ts',
  // @ts-ignore
  driver: 'pg',
  dbCredentials: {
    // @ts-ignore
    connectionString: process.env.POSTGRES_URL!,
  },
});