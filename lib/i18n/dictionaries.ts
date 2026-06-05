import 'server-only'

export type Locale = 'en' | 'zh'

export type Dictionary = {
  nav: { collection: string; new: string; edit: string }
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
    clear_all: string
    empty: string
    empty_hint: string
    empty_filtered: string
  }
  header: {
    search: string
    add: string
    switch_view: string
    exit_fullscreen: string
    filter: string
    profile: string
    settings: string
    circle_unavailable: string
    circle_unavailable_hint: string
    sort_by: string
    sort_name: string
    sort_date: string
    sort_kingdom: string
    filter_by_kingdom: string
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
    return: string
    taxonomy: string
    date_added: string
    observed_location: string
    edit: string
    delete_title: string
    delete_description: string
    delete_confirm: string
    delete_pending: string
  }
  auth: {
    login: string
    register: string
    username: string
    password: string
    confirm_password: string
    login_error: string
    username_taken: string
    username_invalid: string
    password_short: string
    password_mismatch: string
    register_error: string
    logout: string
    no_account: string
    have_account: string
  }
  actions: { save: string; saving: string; uploading: string; cancel: string; delete: string }
  form: {
    species_placeholder: string
    species_trigger: string
    species_hint: string
    date_placeholder: string
    location_placeholder: string
    notes_placeholder: string
    photos_hint: string
    caption_placeholder: string
    add_caption: string
    caption_added: string
    no_results: string
    searching: string
    save_error: string
    auto_fill: string
    auto_fill_hint: string
    manual_entry: string
    manual_entry_hint: string
    common_name: string
    common_name_en: string
    scientific_name: string
    change: string
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
