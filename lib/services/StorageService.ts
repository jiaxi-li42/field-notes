import { Photo } from '@/lib/models/Photo'

export class StorageService {
  // Stub for Phase 1–4. Phase 5: replace with Cloudflare R2 upload.
  static async uploadPhoto(file: File): Promise<Photo> {
    const url = URL.createObjectURL(file)
    return new Photo(url, file.name)
  }
}
