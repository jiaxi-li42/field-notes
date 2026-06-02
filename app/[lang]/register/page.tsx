import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { langPrefix } from '@/lib/utils/i18n'

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const session = await auth()
  if (session) redirect(langPrefix(lang) || '/')

  const dict = await getDictionary(lang)

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl tracking-tight">{dict.auth.register}</h1>
        <RegisterForm lang={lang} dict={dict.auth} />
      </div>
    </main>
  )
}
