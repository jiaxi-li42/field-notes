'use server'

import { headers } from 'next/headers'
import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { signIn } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function register(formData: FormData): Promise<{ error?: string }> {
  const ip = await getClientIp()
  if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: 'rate_limited' }
  }

  const username = (formData.get('username') as string)?.trim()
  const password = formData.get('password') as string

  if (!username || username.length < 3 || username.length > 20) {
    return { error: 'username_invalid' }
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'username_invalid' }
  }
  if (!password || password.length < 6) {
    return { error: 'password_short' }
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (existing) {
    return { error: 'username_taken' }
  }

  const id = crypto.randomUUID()
  const passwordHash = await hash(password, 12)

  await db.insert(users).values({
    id,
    username,
    passwordHash,
    createdAt: new Date(),
  })

  return {}
}

export async function login(formData: FormData): Promise<{ error?: string }> {
  const ip = await getClientIp()
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return { error: 'rate_limited' }
  }

  const username = formData.get('username') as string
  const password = formData.get('password') as string

  try {
    await signIn('credentials', {
      username,
      password,
      redirect: false,
    })
    return {}
  } catch {
    return { error: 'invalid_credentials' }
  }
}
