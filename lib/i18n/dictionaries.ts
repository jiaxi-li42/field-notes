import 'server-only'

export type Locale = 'en' | 'zh'

export type Dictionary = {
  nav: { collection: string; new: string }
  kingdoms: Record<string, string>
  recording: {
    date: string
    location: string
    notes: string
    species: string
    photos: string
  }
  collection: {
    filter_all: string
    empty: string
    empty_hint: string
    empty_filtered: string
  }
  header: {
    search: string
    add: string
    switch_view: string
    exit_fullscreen: string
  }
  ranks: {
    kingdom: string
    phylum: string
    class: string
    order: string
    family: string
    genus: string
    species: string
  }
  detail: {
    taxonomy: string
    all_recordings: string
  }
  actions: { save: string; cancel: string; delete: string }
  form: {
    species_placeholder: string
    species_hint: string
    date_placeholder: string
    location_placeholder: string
    notes_placeholder: string
    photos_hint: string
    no_results: string
    searching: string
    save_error: string
  }
}

const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => import('@/messages/en.json'),
  zh: () => import('@/messages/zh.json'),
}

export async function getDictionary(lang: string): Promise<Dictionary> {
  const loader = loaders[lang as Locale] ?? loaders.en
  return (await loader()).default
}
