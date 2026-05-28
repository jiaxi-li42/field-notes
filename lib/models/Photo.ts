export class Photo {
  public readonly id: string

  constructor(
    public readonly url: string,
    public readonly caption: string = '',
    id?: string,
  ) {
    this.id = id ?? `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}
