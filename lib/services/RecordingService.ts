import 'server-only'
import { eq, desc, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { recordings, photos } from '@/lib/db/schema'
import { Recording } from '@/lib/models/Recording'
import { Species } from '@/lib/models/Species'
import type { Kingdom } from '@/lib/models/Species'
import { Taxon } from '@/lib/models/Taxon'
import { Location } from '@/lib/models/Location'
import { Photo } from '@/lib/models/Photo'
import { StorageService } from '@/lib/services/StorageService'

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
    row.taxonKingdomZh,
    row.taxonPhylumZh,
    row.taxonClassZh,
    row.taxonOrderZh,
    row.taxonFamilyZh,
    row.taxonGenusZh,
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
    .map((p) => new Photo(p.url, p.caption, p.width, p.height, p.id))

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

type PhotoInput = { id: string; url: string; caption: string; width: number; height: number }

export type CreateRecordingInput = {
  species: Species
  date: Date
  location: Location
  photos: PhotoInput[]
  notes: string
}

async function insertPhotos(recordingId: string, items: PhotoInput[]) {
  if (items.length === 0) return
  await db.insert(photos).values(
    items.map((p, i) => ({
      id: p.id,
      recordingId,
      url: p.url,
      caption: p.caption,
      width: p.width,
      height: p.height,
      sortOrder: i,
    })),
  )
}

/** Shared field mapping from domain objects to the recordings table. */
function speciesFields(input: CreateRecordingInput) {
  const { species, date, location, notes } = input
  return {
    speciesGbifKey: species.gbifKey,
    speciesCanonicalName: species.canonicalName,
    speciesVernacularNameEn: species.vernacularNameEn,
    speciesVernacularNameZh: species.vernacularNameZh,
    speciesKingdom: species.kingdom,
    taxonKingdom: species.taxon.kingdom,
    taxonPhylum: species.taxon.phylum,
    taxonClass: species.taxon.taxonomyClass,
    taxonOrder: species.taxon.order,
    taxonFamily: species.taxon.family,
    taxonGenus: species.taxon.genus,
    taxonSpecies: species.taxon.species,
    taxonKingdomZh: species.taxon.kingdomZh,
    taxonPhylumZh: species.taxon.phylumZh,
    taxonClassZh: species.taxon.taxonomyClassZh,
    taxonOrderZh: species.taxon.orderZh,
    taxonFamilyZh: species.taxon.familyZh,
    taxonGenusZh: species.taxon.genusZh,
    date: date.toISOString(),
    locationPlaceName: location.placeName,
    locationLat: location.lat ?? null,
    locationLng: location.lng ?? null,
    notes,
  }
}

export class RecordingService {
  static async getAll(userId: string): Promise<Recording[]> {
    const rows = await db
      .select()
      .from(recordings)
      .where(eq(recordings.userId, userId))
      .orderBy(desc(recordings.date))

    if (rows.length === 0) return []

    // Batch: single query for all photos instead of N+1
    const recordingIds = rows.map((r) => r.id)
    const allPhotos = await db
      .select()
      .from(photos)
      .where(inArray(photos.recordingId, recordingIds))

    const photosByRecording = new Map<string, PhotoRow[]>()
    for (const p of allPhotos) {
      const list = photosByRecording.get(p.recordingId) ?? []
      list.push(p)
      photosByRecording.set(p.recordingId, list)
    }

    return rows.map((row) => hydrate(row, photosByRecording.get(row.id) ?? []))
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

  static async create(userId: string, input: CreateRecordingInput): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await db.insert(recordings).values({ id, userId, ...speciesFields(input), createdAt: new Date() })
    await insertPhotos(id, input.photos)
  }

  static async update(userId: string, id: string, input: CreateRecordingInput): Promise<void> {
    const [row] = await db
      .select({ userId: recordings.userId })
      .from(recordings)
      .where(eq(recordings.id, id))
      .limit(1)

    if (!row || row.userId !== userId) return

    await db.update(recordings).set(speciesFields(input)).where(eq(recordings.id, id))

    // Replace photos: find removed ones, delete from R2, then replace rows
    const oldPhotos = await db
      .select({ id: photos.id, url: photos.url })
      .from(photos)
      .where(eq(photos.recordingId, id))

    const newPhotoIds = new Set(input.photos.map((p) => p.id))
    const removedPhotos = oldPhotos.filter((p) => !newPhotoIds.has(p.id))

    await db.delete(photos).where(eq(photos.recordingId, id))
    await insertPhotos(id, input.photos)

    // Delete removed photos from R2 in background (non-blocking)
    if (removedPhotos.length > 0) {
      void Promise.allSettled(removedPhotos.map((p) => StorageService.deletePhoto(p.url)))
    }
  }

  static async delete(userId: string, id: string): Promise<void> {
    const [row] = await db
      .select({ userId: recordings.userId })
      .from(recordings)
      .where(eq(recordings.id, id))
      .limit(1)

    if (!row || row.userId !== userId) return

    // Clean up R2 photos before deleting DB rows
    const photoRows = await db
      .select({ url: photos.url })
      .from(photos)
      .where(eq(photos.recordingId, id))

    await db.delete(photos).where(eq(photos.recordingId, id))
    await db.delete(recordings).where(eq(recordings.id, id))

    // Delete from R2 in background (non-blocking)
    void Promise.allSettled(photoRows.map((p) => StorageService.deletePhoto(p.url)))
  }
}
