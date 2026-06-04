export class Taxon {
  constructor(
    public readonly kingdom: string,
    public readonly phylum: string,
    public readonly taxonomyClass: string,
    public readonly order: string,
    public readonly family: string,
    public readonly genus: string,
    public readonly species: string,
    public readonly kingdomZh: string = '',
    public readonly phylumZh: string = '',
    public readonly taxonomyClassZh: string = '',
    public readonly orderZh: string = '',
    public readonly familyZh: string = '',
    public readonly genusZh: string = '',
  ) {}
}
