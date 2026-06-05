import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { auth } from '@/lib/auth'
import { r2, getR2PublicUrl } from '@/lib/services/r2'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const key = `photos/${session.user.id}/${id}.webp`

  const raw = Buffer.from(await file.arrayBuffer())
  const buffer = file.type === 'image/webp'
    ? raw
    : await sharp(raw).webp({ quality: 80 }).toBuffer()

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
    }),
  )

  return NextResponse.json({ id, url: getR2PublicUrl(key) })
}
