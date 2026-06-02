'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login } from '@/app/actions/auth'
import { langPrefix } from '@/lib/utils/i18n'

interface LoginFormProps {
  lang: string
  dict: {
    login: string
    username: string
    password: string
    login_error: string
    no_account: string
    register: string
  }
}

export function LoginForm({ lang, dict }: LoginFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const prefix = langPrefix(lang)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await login(formData)
      if (result.error) {
        setError(dict.login_error)
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
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '…' : dict.login}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {dict.no_account}{' '}
        <Link href={`${prefix}/register`} className="underline underline-offset-2 hover:text-foreground">
          {dict.register}
        </Link>
      </p>
    </form>
  )
}
