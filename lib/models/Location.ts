export class Location {
  constructor(
    public readonly placeName: string,
    public readonly lat?: number,
    public readonly lng?: number,
  ) {}
}
