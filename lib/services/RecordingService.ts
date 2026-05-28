import 'server-only'
import { Recording } from '@/lib/models/Recording'
import { Species } from '@/lib/models/Species'
import type { Kingdom } from '@/lib/models/Species'
import { Taxon } from '@/lib/models/Taxon'
import { Location } from '@/lib/models/Location'
import { Photo } from '@/lib/models/Photo'
import fixtureData from '@/lib/fixtures/recordings.json'

interface RawTaxon {
  kingdom: string
  phylum: string
  taxonomyClass: string
  order: string
  family: string
  genus: string
  species: string
}

interface RawSpecies {
  gbifKey: number
  canonicalName: string
  vernacularNameEn: string
  vernacularNameZh: string
  taxon: RawTaxon
  kingdom: string
}

interface RawLocation {
  placeName: string
  lat?: number
  lng?: number
}

interface RawPhoto {
  url: string
  caption: string
  id: string
}

interface RawRecording {
  id: string
  species: RawSpecies
  date: string
  location: RawLocation
  photos: RawPhoto[]
  notes: string
  createdAt: string
}

function hydrate(raw: RawRecording): Recording {
  const taxon = new Taxon(
    raw.species.taxon.kingdom,
    raw.species.taxon.phylum,
    raw.species.taxon.taxonomyClass,
    raw.species.taxon.order,
    raw.species.taxon.family,
    raw.species.taxon.genus,
    raw.species.taxon.species,
  )
  const species = new Species(
    raw.species.gbifKey,
    raw.species.canonicalName,
    raw.species.vernacularNameEn,
    raw.species.vernacularNameZh,
    taxon,
    raw.species.kingdom as Kingdom,
  )
  const location = new Location(
    raw.location.placeName,
    raw.location.lat,
    raw.location.lng,
  )
  const photos = raw.photos.map((p) => new Photo(p.url, p.caption, p.id))
  return new Recording(
    raw.id,
    species,
    new Date(raw.date),
    location,
    photos,
    raw.notes,
    new Date(raw.createdAt),
  )
}

const store = new Map<string, Recording>(
  (fixtureData as RawRecording[]).map((raw) => {
    const r = hydrate(raw)
    return [r.id, r]
  }),
)

export type CreateRecordingInput = {
  species: Species
  date: Date
  location: Location
  photos: Photo[]
  notes: string
}

export class RecordingService {
  static getAll(): Recording[] {
    return Array.from(store.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    )
  }

  static getById(id: string): Recording | null {
    return store.get(id) ?? null
  }

  static create(input: CreateRecordingInput): Recording {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const recording = new Recording(
      id,
      input.species,
      input.date,
      input.location,
      input.photos,
      input.notes,
    )
    store.set(id, recording)
    return recording
  }

  static delete(id: string): void {
    store.delete(id)
  }
}
