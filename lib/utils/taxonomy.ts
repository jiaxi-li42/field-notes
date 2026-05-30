import { Taxon } from '@/lib/models/Taxon'

export function buildTaxonRows(taxon: Taxon): [string, string][] {
  return (
    [
      ['Kingdom', taxon.kingdom],
      ['Phylum', taxon.phylum],
      ['Class', taxon.taxonomyClass],
      ['Order', taxon.order],
      ['Family', taxon.family],
      ['Genus', taxon.genus],
      ['Species', taxon.species],
    ] as [string, string][]
  ).filter(([, v]) => v)
}
