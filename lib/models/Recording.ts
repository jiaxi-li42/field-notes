import type { Species } from './Species'
import type { Location } from './Location'
import type { Photo } from './Photo'

export class Recording {
  public readonly createdAt: Date

  constructor(
    public readonly id: string,
    public readonly species: Species,
    public readonly date: Date,
    public readonly location: Location,
    public readonly photos: Photo[],
    public readonly notes: string,
    createdAt?: Date,
  ) {
    this.createdAt = createdAt ?? new Date()
  }
}
