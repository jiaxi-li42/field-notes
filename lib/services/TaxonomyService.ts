import 'server-only'
import { Species } from '@/lib/models/Species'
import type { Kingdom } from '@/lib/models/Species'
import { Taxon } from '@/lib/models/Taxon'

interface GBIFSuggestion {
  key: number
  scientificName: string
  canonicalName: string
  rank: string
  kingdom: string
  phylum: string
  class: string
  order: string
  family: string
  genus: string
  species: string
}

export class TaxonomyService {
  private static readonly BASE = 'https://api.gbif.org/v1'

  static async search(query: string): Promise<Species[]> {
    if (query.trim().length < 2) return []
    const res = await fetch(
      `${this.BASE}/species/suggest?q=${encodeURIComponent(query)}&limit=10`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const data: GBIFSuggestion[] = await res.json()
    return data
      .filter((s) => s.canonicalName)
      .map((s) => TaxonomyService.fromGBIF(s))
  }

  private static fromGBIF(s: GBIFSuggestion): Species {
    const taxon = new Taxon(
      s.kingdom ?? '',
      s.phylum ?? '',
      s.class ?? '',
      s.order ?? '',
      s.family ?? '',
      s.genus ?? '',
      s.species ?? '',
    )
    return new Species(
      s.key,
      s.canonicalName,
      '',
      '',
      taxon,
      (s.kingdom as Kingdom) ?? 'Animalia',
    )
  }
}
