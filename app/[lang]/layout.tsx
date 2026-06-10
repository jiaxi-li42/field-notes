import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const locales = ['en', 'zh'] as const

const meta: Record<string, { title: string; description: string }> = {
  en: { title: 'The Dandelion — Your nature field notes', description: 'Observe, record, and share the nature around you.' },
  zh: { title: 'The Dandelion — 你的自然观察笔记', description: '观察，记录，分享你眼中的自然。' },
}

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  return meta[lang] ?? meta.en
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
