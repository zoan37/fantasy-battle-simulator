import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import {
  pgTable,
  serial,
  text,
  timestamp
} from 'drizzle-orm/pg-core';
 
export const EnemiesTable = pgTable(
  'enemies',
  {
    id: serial('id').primaryKey(),
    type: text('type').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    imageUrl: text('imageurl').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
);