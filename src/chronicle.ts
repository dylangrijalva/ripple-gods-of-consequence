import { advance, createWorld, intervene, type Power, type State } from './simulation'

export const HISTORY_LENGTH = 60
const SAVE_KEY = 'ripple:chronicle:1'
export type Chronicle = { history: State[], lastPower: { power: Power, day: number } | null }

export function nextDays(start: State, days: number): State[] {
  const history = [start]
  for (let i = 0; i < days; i++) history.push(advance(history[history.length - 1]))
  return history
}

export function loadChronicle(seed: number): Chronicle {
  const first = createWorld(seed)
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      const fields = Object.entries(first)
      if (saved.seed === seed && Array.isArray(saved.history) && saved.history.length > 0 && saved.history.length <= HISTORY_LENGTH &&
          saved.history.every((state: State, i: number) =>
            state && state.seed === seed && fields.every(([key, value]) => {
              const actual = state[key as keyof State]
              return typeof value === 'number' ? Number.isFinite(actual) : typeof actual === typeof value
            }) && (!i || state.day === saved.history[i - 1].day + 1)
          )) {
        const last = saved.lastPower
        const lastPower = last && ['sun', 'rain', 'storm', 'bloom'].includes(last.power) && Number.isSafeInteger(last.day) ? last : null
        return {history: saved.history, lastPower}
      }
    }
  } catch { /* Storage can be disabled in private browsing. */ }
  return { history: nextDays(first, 17), lastPower: null }
}

export function saveChronicle(chronicle: Chronicle) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...chronicle, seed: chronicle.history[0].seed }))
  } catch { /* The simulation still works when storage is unavailable. */ }
}

export function advanceChronicle(current: Chronicle): Chronicle {
  const next = advance(current.history[current.history.length - 1])
  return { ...current, history: [...current.history.slice(1 - HISTORY_LENGTH), next] }
}

export function castPower(current: Chronicle, power: Power): Chronicle {
  const latest = intervene(current.history[current.history.length - 1], power)
  return { history: [...current.history.slice(0, -1), latest], lastPower: {power, day: latest.day} }
}
