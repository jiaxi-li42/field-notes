import { notFound } from 'next/navigation'

const locales = ['en', 'zh'] as const

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!(locales as readonly string[]).includes(lang)) notFound()
  // data-lang drives font switching: CSS uses [data-lang="zh"] → Noto Serif TC (思源宋體)
  return <div data-lang={lang}>{children}</div>
}
