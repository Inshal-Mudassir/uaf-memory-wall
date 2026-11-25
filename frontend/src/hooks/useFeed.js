import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

const PAGE = 12

/** Paginated memories for a set of filters, with helpers to patch the list in place. */
export function useFeed({ q, category, sort }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nonce, setNonce] = useState(0)
  const busy = useRef(false)

  // Reset and load the first page whenever filters change.
  useEffect(() => {
    const ctrl = new AbortController()
    busy.current = true
    setLoading(true)
    setError(null)
    api.listMemories({ q, category, sort, page: 1, limit: PAGE }, ctrl.signal)
      .then((d) => {
        setItems(d.items); setHasMore(d.hasMore); setTotal(d.total); setPage(1)
      })
      .catch((e) => e.name !== 'AbortError' && setError(e.message))
      .finally(() => { if (!ctrl.signal.aborted) { busy.current = false; setLoading(false) } })
    return () => ctrl.abort()
  }, [q, category, sort, nonce])

  const loadMore = useCallback(() => {
    if (busy.current || !hasMore) return
    busy.current = true
    setLoading(true)
    api.listMemories({ q, category, sort, page: page + 1, limit: PAGE })
      .then((d) => {
        // Drop any duplicates that shift in when new memories are posted mid-scroll.
        setItems((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          return [...prev, ...d.items.filter((m) => !seen.has(m.id))]
        })
        setHasMore(d.hasMore); setTotal(d.total); setPage(page + 1)
      })
      .catch((e) => setError(e.message))
      .finally(() => { busy.current = false; setLoading(false) })
  }, [q, category, sort, page, hasMore])

  const patch = useCallback((id, changes) => setItems((p) => p.map((m) => (m.id === id ? { ...m, ...changes } : m))), [])
  const prepend = useCallback((m) => { setItems((p) => [m, ...p.filter((x) => x.id !== m.id)]); setTotal((t) => t + 1) }, [])

  return { items, total, hasMore, loading, error, loadMore, patch, prepend, reload: () => setNonce((n) => n + 1) }
}
