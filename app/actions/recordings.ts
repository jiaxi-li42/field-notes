'use server'

import { RecordingService } from '@/lib/services/RecordingService'
import { Species } from '@/lib/models/Species'
import type { Kingdom } from '@/lib/models/Species'
import { Taxon } from '@/lib/models/Taxon'
import { Location } from '@/lib/models/Location'

export type RecordingPayload = {
  speciesGbifKey: number
  speciesCanonicalName: string
  speciesVernacularEn: string
  speciesVernacularZh: string
  speciesKingdom: string
  taxonPhylum: string
  taxonClass: string
  taxonOrder: string
  taxonFamily: string
  taxonGenus: string
  taxonSpecies: string
  date: string
  locationPlaceName: string
  notes: string
}

export async function createRecording(payload: RecordingPayload): Promise<{ id: string }> {
  const taxon = new Taxon(
    payload.speciesKingdom,
    payload.taxonPhylum,
    payload.taxonClass,
    payload.taxonOrder,
    payload.taxonFamily,
    payload.taxonGenus,
    payload.taxonSpecies,
  )
  const species = new Species(
    payload.speciesGbifKey,
    payload.speciesCanonicalName,
    payload.speciesVernacularEn,
    payload.speciesVernacularZh,
    taxon,
    payload.speciesKingdom as Kingdom,
  )
  const location = new Location(payload.locationPlaceName)
  const recording = RecordingService.create({
    species,
    date: new Date(payload.date),
    location,
    photos: [],
    notes: payload.notes,
  })
  return { id: recording.id }
}
