import type { Taxon } from './Taxon'

export type Kingdom = 'Animalia' | 'Plantae' | 'Fungi' | 'Protista' | 'Monera'

export class Species {
  constructor(
    public readonly gbifKey: number,
    public readonly canonicalName: string,
    public readonly vernacularNameEn: string,
    public readonly vernacularNameZh: string,
    public readonly taxon: Taxon,
    public readonly kingdom: Kingdom,
  ) {}
}
