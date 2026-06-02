import 'server-only'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2 } from '@/lib/services/r2'

export class StorageService {
  static async deletePhoto(url: string): Promise<void> {
    const publicUrl = process.env.R2_PUBLIC_URL!
    if (!url.startsWith(publicUrl)) return
    const key = url.slice(publicUrl.length + 1)
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      }),
    )
  }
}
