import { useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../context/Toast'

/** Optimistic like toggle. `onChange(id, {likes, likedByMe})` receives every state change. */
export function useLike(onChange) {
  const toast = useToast()
  return useCallback(
    async (memory) => {
      const next = !memory.likedByMe
      onChange(memory.id, { likedByMe: next, likes: Math.max(0, memory.likes + (next ? 1 : -1)) })
      try {
        const res = await api.setLike(memory.id, next)
        onChange(memory.id, { likedByMe: res.liked, likes: res.likes })
      } catch (e) {
        onChange(memory.id, { likedByMe: memory.likedByMe, likes: memory.likes })
        toast.error(e.message)
      }
    },
    [onChange, toast],
  )
}
