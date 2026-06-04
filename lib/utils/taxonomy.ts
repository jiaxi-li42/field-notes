import { Taxon } from '@/lib/models/Taxon'
import type { Dictionary } from '@/lib/i18n/dictionaries'

export function buildTaxonRows(
  taxon: Taxon,
  ranks: Dictionary['ranks'],
  lang?: string,
): [label: string, value: string, italic: boolean][] {
  const zh = lang === 'zh'
  return (
    [
      [ranks.kingdom, (zh && taxon.kingdomZh) || taxon.kingdom, !zh || !taxon.kingdomZh],
      [ranks.phylum, (zh && taxon.phylumZh) || taxon.phylum, !zh || !taxon.phylumZh],
      [ranks.class, (zh && taxon.taxonomyClassZh) || taxon.taxonomyClass, !zh || !taxon.taxonomyClassZh],
      [ranks.order, (zh && taxon.orderZh) || taxon.order, !zh || !taxon.orderZh],
      [ranks.family, (zh && taxon.familyZh) || taxon.family, !zh || !taxon.familyZh],
      [ranks.genus, (zh && taxon.genusZh) || taxon.genus, !zh || !taxon.genusZh],
      [ranks.species, taxon.species, true],
    ] as [string, string, boolean][]
  ).filter(([, v]) => v)
}
