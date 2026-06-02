'use server'

import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { signIn } from '@/lib/auth'

export async function register(formData: FormData): Promise<{ error?: string }> {
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
