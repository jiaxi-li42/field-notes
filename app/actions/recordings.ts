'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

export async function createRecording(payload: RecordingPayload): Promise<void> {
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
  await RecordingService.create(session.user.id, {
    species,
    date: new Date(payload.date),
    location,
    photos: payload.photos,
    notes: payload.notes,
  })
  revalidatePath('/')
}

export async function updateRecording(id: string, payload: RecordingPayload): Promise<void> {
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
  await RecordingService.update(session.user.id, id, {
    species,
    date: new Date(payload.date),
    location,
    photos: payload.photos,
    notes: payload.notes,
  })
  revalidatePath('/')
}

export async function deleteRecording(id: string, redirectTo: string): Promise<never> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await RecordingService.delete(session.user.id, id)
  revalidatePath('/')
  redirect(redirectTo)
}
