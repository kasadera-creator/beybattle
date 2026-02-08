import { DEFAULT_SETTINGS, normalizeStadium, type Settings } from './types'

const SETTINGS_KEY = 'beybattle.settings'

export function loadSettings(): Settings {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Settings
    return {
      stadium: normalizeStadium(parsed.stadium),
      sideRule: parsed.sideRule ?? DEFAULT_SETTINGS.sideRule,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
