import { computed, type Ref } from 'vue'
import { usePersistedRef } from '../utils/persist'
import { getToolByKey, tools, type ToolItem } from '../config/tools'

let favoritesRef: Ref<string[]> | null = null

function getFavoritesRef() {
  if (!favoritesRef) {
    favoritesRef = usePersistedRef<string[]>('ui.favorites', [])
  }
  return favoritesRef
}

export function useFavorites() {
  const favorites = getFavoritesRef()

  function isFavorite(key: string) {
    return favorites.value.includes(key)
  }

  function toggleFavorite(key: string) {
    if (!getToolByKey(key)) return
    if (favorites.value.includes(key)) {
      favorites.value = favorites.value.filter((k) => k !== key)
    } else {
      favorites.value = [key, ...favorites.value]
    }
  }

  const favoriteTools = computed(() =>
    favorites.value
      .map((key) => getToolByKey(key))
      .filter((t): t is ToolItem => t != null),
  )

  /** 收藏靠前，其余保持原顺序 */
  const sortedTools = computed(() => {
    const favSet = new Set(favorites.value)
    const favs = favorites.value
      .map((key) => getToolByKey(key))
      .filter((t): t is ToolItem => t != null)
    const rest = tools.filter((t) => !favSet.has(t.key))
    return [...favs, ...rest]
  })

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    favoriteTools,
    sortedTools,
  }
}
