export class Photo {
  public readonly id: string

  constructor(
    public readonly url: string,
    public readonly caption: string = '',
    id?: string,
    public readonly width: number = 0,
    public readonly height: number = 0,
  ) {
    this.id = id ?? `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}
