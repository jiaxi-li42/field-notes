/**
 * Seed script — creates a demo user and inserts fixture recordings.
 * Run: npx tsx lib/db/seed.ts
 *
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { hash } from 'bcryptjs'
import { users, recordings, photos } from './schema'
import fixtureData from '../fixtures/recordings.json'

interface RawRecording {
  id: string
  species: {
    gbifKey: number
    canonicalName: string
    vernacularNameEn: string
    vernacularNameZh: string
    taxon: {
      kingdom: string
      phylum: string
      taxonomyClass: string
      order: string
      family: string
      genus: string
      species: string
    }
    kingdom: string
  }
  date: string
  location: { placeName: string; lat?: number; lng?: number }
  photos: { id: string; url: string; caption: string }[]
  notes: string
  createdAt: string
}

async function seed() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  const db = drizzle(client)

  const demoUsername = 'demo'
  const demoPassword = 'demo123'
  const demoId = 'demo-user-001'

  console.log(`Creating demo user: ${demoUsername} / ${demoPassword}`)
  const passwordHash = await hash(demoPassword, 12)
  await db.insert(users).values({
    id: demoId,
    username: demoUsername,
    passwordHash,
    createdAt: new Date(),
  }).onConflictDoNothing()

  const data = fixtureData as RawRecording[]
  console.log(`Inserting ${data.length} fixture recordings…`)

  for (const raw of data) {
    await db.insert(recordings).values({
      id: raw.id,
      userId: demoId,
      speciesGbifKey: raw.species.gbifKey,
      speciesCanonicalName: raw.species.canonicalName,
      speciesVernacularNameEn: raw.species.vernacularNameEn,
      speciesVernacularNameZh: raw.species.vernacularNameZh,
      speciesKingdom: raw.species.kingdom,
      taxonKingdom: raw.species.taxon.kingdom,
      taxonPhylum: raw.species.taxon.phylum,
      taxonClass: raw.species.taxon.taxonomyClass,
      taxonOrder: raw.species.taxon.order,
      taxonFamily: raw.species.taxon.family,
      taxonGenus: raw.species.taxon.genus,
      taxonSpecies: raw.species.taxon.species,
      date: raw.date,
      locationPlaceName: raw.location.placeName,
      locationLat: raw.location.lat ?? null,
      locationLng: raw.location.lng ?? null,
      notes: raw.notes,
      createdAt: new Date(raw.createdAt),
    }).onConflictDoNothing()

    for (const [i, photo] of raw.photos.entries()) {
      await db.insert(photos).values({
        id: photo.id,
        recordingId: raw.id,
        url: photo.url,
        caption: photo.caption,
        sortOrder: i,
      }).onConflictDoNothing()
    }
  }

  console.log('Done.')
  process.exit(0)
}

seed().catch((e) => { console.error(e); process.exit(1) })
