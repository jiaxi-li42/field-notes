import 'server-only'
import { S3Client } from '@aws-sdk/client-s3'

// Pin to globalThis so HMR doesn't leak HTTP connection pools in dev
const globalForR2 = globalThis as unknown as { _r2?: S3Client }

function createR2() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export const r2 = globalForR2._r2 ??= createR2()

export function getR2PublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`
}
