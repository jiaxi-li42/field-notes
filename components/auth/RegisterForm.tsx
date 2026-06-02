'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { register, login } from '@/app/actions/auth'
import { langPrefix } from '@/lib/utils/i18n'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface RegisterFormProps {
  lang: string
  dict: Dictionary['auth']
}

export function RegisterForm({ lang, dict }: RegisterFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const prefix = langPrefix(lang)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      setError(dict.password_mismatch)
      return
    }

    startTransition(async () => {
      const result = await register(formData)
      if (result.error) {
        setError(dict[result.error as keyof typeof dict] ?? dict.register_error)
        return
      }
      const loginResult = await login(formData)
      if (loginResult.error) {
        router.push(`${prefix}/login`)
      } else {
        router.push(prefix || '/')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">{dict.username}</label>
        <Input id="username" name="username" required autoComplete="username" />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">{dict.password}</label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirm" className="text-sm font-medium">{dict.confirm_password}</label>
        <Input id="confirm" name="confirm" type="password" required autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '…' : dict.register}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {dict.have_account}{' '}
        <Link href={`${prefix}/login`} className="underline underline-offset-2 hover:text-foreground">
          {dict.login}
        </Link>
      </p>
    </form>
  )
}
