import { ref, watch, type Ref } from 'vue'

const PREFIX = 'modernia:'

export function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function savePersisted(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // quota / private mode — ignore
  }
}

/** Sync a ref with localStorage; deep-watch objects/arrays. */
export function usePersistedRef<T>(key: string, fallback: T): Ref<T> {
  const data = ref(loadPersisted(key, fallback)) as Ref<T>
  watch(
    data,
    (value) => {
      savePersisted(key, value)
    },
    { deep: true },
  )
  return data
}

export function loadPersistedString(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ?? fallback
  } catch {
    return fallback
  }
}

export function savePersistedString(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    // ignore
  }
}

/** Debounced string saver (e.g. editor document). Call cancel/flush from the consumer lifecycle. */
export function createDebouncedStringSaver(key: string, delayMs = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null

  function save(value: string) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      savePersistedString(key, value)
    }, delayMs)
  }

  function flush(value: string) {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    savePersistedString(key, value)
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { save, flush, cancel }
}
