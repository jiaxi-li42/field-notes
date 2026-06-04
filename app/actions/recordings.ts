'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
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
  taxonKingdomZh: string
  taxonPhylumZh: string
  taxonClassZh: string
  taxonOrderZh: string
  taxonFamilyZh: string
  taxonGenusZh: string
  date: string
  locationPlaceName: string
  notes: string
  photos: { id: string; url: string; caption: string; width: number; height: number }[]
}

export async function createRecording(payload: RecordingPayload): Promise<{ id: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const taxon = new Taxon(
    payload.speciesKingdom,
    payload.taxonPhylum,
    payload.taxonClass,
    payload.taxonOrder,
    payload.taxonFamily,
    payload.taxonGenus,
    payload.taxonSpecies,
    payload.taxonKingdomZh,
    payload.taxonPhylumZh,
    payload.taxonClassZh,
    payload.taxonOrderZh,
    payload.taxonFamilyZh,
    payload.taxonGenusZh,
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
  const recording = await RecordingService.create(session.user.id, {
    species,
    date: new Date(payload.date),
    location,
    photos: payload.photos,
    notes: payload.notes,
  })
  revalidatePath('/')
  return { id: recording.id }
}

export async function deleteRecording(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await RecordingService.delete(session.user.id, id)
  revalidatePath('/')
}
