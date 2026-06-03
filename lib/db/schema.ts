import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const recordings = sqliteTable('recordings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  speciesGbifKey: integer('species_gbif_key').notNull(),
  speciesCanonicalName: text('species_canonical_name').notNull(),
  speciesVernacularNameEn: text('species_vernacular_name_en').notNull().default(''),
  speciesVernacularNameZh: text('species_vernacular_name_zh').notNull().default(''),
  speciesKingdom: text('species_kingdom').notNull(),
  taxonKingdom: text('taxon_kingdom').notNull(),
  taxonPhylum: text('taxon_phylum').notNull().default(''),
  taxonClass: text('taxon_class').notNull().default(''),
  taxonOrder: text('taxon_order').notNull().default(''),
  taxonFamily: text('taxon_family').notNull().default(''),
  taxonGenus: text('taxon_genus').notNull().default(''),
  taxonSpecies: text('taxon_species').notNull().default(''),
  date: text('date').notNull(),
  locationPlaceName: text('location_place_name').notNull().default(''),
  locationLat: real('location_lat'),
  locationLng: real('location_lng'),
  notes: text('notes').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  recordingId: text('recording_id').notNull().references(() => recordings.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  caption: text('caption').notNull().default(''),
  width: integer('width').notNull().default(0),
  height: integer('height').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
})
