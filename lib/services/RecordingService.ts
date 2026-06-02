import 'server-only'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { recordings, photos } from '@/lib/db/schema'
import { Recording } from '@/lib/models/Recording'
import { Species } from '@/lib/models/Species'
import type { Kingdom } from '@/lib/models/Species'
import { Taxon } from '@/lib/models/Taxon'
import { Location } from '@/lib/models/Location'
import { Photo } from '@/lib/models/Photo'

type RecordingRow = typeof recordings.$inferSelect
type PhotoRow = typeof photos.$inferSelect

function hydrate(row: RecordingRow, photoRows: PhotoRow[]): Recording {
  const taxon = new Taxon(
    row.taxonKingdom,
    row.taxonPhylum,
    row.taxonClass,
    row.taxonOrder,
    row.taxonFamily,
    row.taxonGenus,
    row.taxonSpecies,
  )
  const species = new Species(
    row.speciesGbifKey,
    row.speciesCanonicalName,
    row.speciesVernacularNameEn,
    row.speciesVernacularNameZh,
    taxon,
    row.speciesKingdom as Kingdom,
  )
  const location = new Location(
    row.locationPlaceName,
    row.locationLat ?? undefined,
    row.locationLng ?? undefined,
  )
  const photoList = photoRows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => new Photo(p.url, p.caption, p.id))

  return new Recording(
    row.id,
    species,
    new Date(row.date),
    location,
    photoList,
    row.notes,
    new Date(row.createdAt),
  )
}

export type CreateRecordingInput = {
  species: Species
  date: Date
  location: Location
  photos: { id: string; url: string; caption: string }[]
  notes: string
}

export class RecordingService {
  static async getAll(userId: string): Promise<Recording[]> {
    const rows = await db
      .select()
      .from(recordings)
      .where(eq(recordings.userId, userId))
      .orderBy(desc(recordings.date))

    const results: Recording[] = []
    for (const row of rows) {
      const photoRows = await db
        .select()
        .from(photos)
        .where(eq(photos.recordingId, row.id))
      results.push(hydrate(row, photoRows))
    }
    return results
  }

  static async getById(userId: string, id: string): Promise<Recording | null> {
    const [row] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, id))
      .limit(1)

    if (!row || row.userId !== userId) return null

    const photoRows = await db
      .select()
      .from(photos)
      .where(eq(photos.recordingId, id))

    return hydrate(row, photoRows)
  }

  static async create(userId: string, input: CreateRecordingInput): Promise<Recording> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const now = new Date()

    await db.insert(recordings).values({
      id,
      userId,
      speciesGbifKey: input.species.gbifKey,
      speciesCanonicalName: input.species.canonicalName,
      speciesVernacularNameEn: input.species.vernacularNameEn,
      speciesVernacularNameZh: input.species.vernacularNameZh,
      speciesKingdom: input.species.kingdom,
      taxonKingdom: input.species.taxon.kingdom,
      taxonPhylum: input.species.taxon.phylum,
      taxonClass: input.species.taxon.taxonomyClass,
      taxonOrder: input.species.taxon.order,
      taxonFamily: input.species.taxon.family,
      taxonGenus: input.species.taxon.genus,
      taxonSpecies: input.species.taxon.species,
      date: input.date.toISOString(),
      locationPlaceName: input.location.placeName,
      locationLat: input.location.lat ?? null,
      locationLng: input.location.lng ?? null,
      notes: input.notes,
      createdAt: now,
    })

    if (input.photos.length > 0) {
      await db.insert(photos).values(
        input.photos.map((p, i) => ({
          id: p.id,
          recordingId: id,
          url: p.url,
          caption: p.caption,
          sortOrder: i,
        })),
      )
    }

    const photoList = input.photos.map((p) => new Photo(p.url, p.caption, p.id))
    return new Recording(
      id,
      input.species,
      input.date,
      input.location,
      photoList,
      input.notes,
      now,
    )
  }

  static async delete(userId: string, id: string): Promise<void> {
    const [row] = await db
      .select({ userId: recordings.userId })
      .from(recordings)
      .where(eq(recordings.id, id))
      .limit(1)

    if (!row || row.userId !== userId) return

    await db.delete(photos).where(eq(photos.recordingId, id))
    await db.delete(recordings).where(eq(recordings.id, id))
  }
}
