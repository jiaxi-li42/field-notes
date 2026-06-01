import { Taxon } from '@/lib/models/Taxon'
import type { Dictionary } from '@/lib/i18n/dictionaries'

export function buildTaxonRows(taxon: Taxon, ranks: Dictionary['ranks']): [string, string][] {
  return (
    [
      [ranks.kingdom, taxon.kingdom],
      [ranks.phylum, taxon.phylum],
      [ranks.class, taxon.taxonomyClass],
      [ranks.order, taxon.order],
      [ranks.family, taxon.family],
      [ranks.genus, taxon.genus],
      [ranks.species, taxon.species],
    ] as [string, string][]
  ).filter(([, v]) => v)
}
