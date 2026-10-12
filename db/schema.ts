import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const sourceCache=sqliteTable('source_cache',{
 key:text('key').primaryKey(), data:text('data').notNull(), updatedAt:text('updated_at').notNull()
});
export const observations=sqliteTable('index_observations',{
 date:text('date').primaryKey(), score:integer('score'), coverage:integer('coverage').notNull(),
 eventDate:text('event_date'), method:text('method').notNull(), checkedAt:text('checked_at').notNull()
});
