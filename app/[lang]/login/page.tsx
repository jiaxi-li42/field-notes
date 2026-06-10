import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { LoginForm } from '@/components/auth/LoginForm'
import { langPrefix } from '@/lib/utils/i18n'

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const session = await auth()
  if (session) redirect(langPrefix(lang) || '/')

  const dict = await getDictionary(lang)

  return (
    <AuthLayout title={dict.auth.login_title} subtitle={dict.auth.login_subtitle}>
      <LoginForm lang={lang} dict={dict.auth} />
    </AuthLayout>
  )
}
