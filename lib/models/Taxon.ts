export class Taxon {
  constructor(
    public readonly kingdom: string,
    public readonly phylum: string,
    public readonly taxonomyClass: string,
    public readonly order: string,
    public readonly family: string,
    public readonly genus: string,
    public readonly species: string,
  ) {}
}
