import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Plus, RotateCcw, Search, X } from 'lucide-react'
import MemoryCard from './MemoryCard'
import EmptyState from './EmptyState'
import { GallerySkeleton } from './Skeletons'
import { useColumnCount } from '../hooks/useColumns'
import { SORTS } from '../lib/constants'
import { aspectOf } from '../lib/utils'
import { useAppUI } from '../context/AppUI'

// Pinterest-style masonry: each card goes to the currently shortest column,
// judged by its photo proportions, so columns stay balanced as more memories load.
function distribute(items, n) {
  const cols = Array.from({ length: n }, () => ({ h: 0, items: [] }))
  items.forEach((m) => {
    const est = aspectOf(m.images[0]) + (m.title ? 0.78 : 0.66)
    const target = cols.reduce((a, b) => (b.h < a.h - 0.001 ? b : a))
    target.items.push(m)
    target.h += est
  })
  return cols
}

export default function Gallery({ feed, filters, setFilters, onOpen, onLike }) {
  const { openShare } = useAppUI()
  const columns = useColumnCount()
  const [searchText, setSearchText] = useState(filters.q)
  const sentinel = useRef(null)
  const { items, loading, hasMore, error, loadMore, total, reload } = feed

  // Search as you type, but wait a moment so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === searchText.trim() ? f : { ...f, q: searchText.trim() })), 350)
    return () => clearTimeout(t)
  }, [searchText, setFilters])

  // Infinite scroll
  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasMore) return undefined
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: '700px 0px' })
    io.observe(node)
    return () => io.disconnect()
  }, [hasMore, loadMore, items.length])

  const cols = useMemo(() => distribute(items, columns), [items, columns])
  const filtered = Boolean(filters.q || filters.category)
  const clearAll = () => { setSearchText(''); setFilters((f) => ({ ...f, q: '', category: '' })) }

  return (
    <section id="explore" className="pinboard border-y border-paper-edge py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-4xl text-ink sm:text-5xl">The wall</h2>
            <p className="mt-2 max-w-xl text-ink-soft">Wander through photographs and stories pinned by students and graduates.</p>
          </div>
          <button onClick={openShare} className="btn-primary self-start sm:self-auto"><Plus className="h-4 w-4" aria-hidden="true" />Pin a memory</button>
        </div>

        {/* Toolbar */}
        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-paper-edge bg-paper/95 p-3 shadow-soft sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search memories</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by word, title or name" maxLength={80} className="field !pl-11" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <span className="shrink-0">Sort</span>
            <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} className="field !w-auto min-w-[9.5rem]">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 flex min-h-[2rem] flex-wrap items-center gap-3 text-sm text-ink-soft" aria-live="polite">
          {!error && (loading && !items.length ? <span>Loading memories</span> : <span>{total} {total === 1 ? 'memory' : 'memories'}{filtered ? ' match' : ''}</span>)}
          {filters.category && (
            <button onClick={() => setFilters((f) => ({ ...f, category: '' }))} className="inline-flex items-center gap-1.5 rounded-full bg-leaf-700 px-3 py-1 text-[13px] font-semibold text-paper hover:bg-leaf-800">
              {filters.category}<X className="h-3.5 w-3.5" aria-label="Clear category" />
            </button>
          )}
          {filtered && <button onClick={clearAll} className="font-semibold text-leaf-700 underline underline-offset-4 hover:text-leaf-900">Clear filters</button>}
        </div>

        <div className="mt-7">
          {error && !items.length ? (
            <EmptyState title="The wall didn't load" text={error}><button onClick={reload} className="btn-primary"><RotateCcw className="h-4 w-4" aria-hidden="true" />Try again</button></EmptyState>
          ) : loading && !items.length ? (
            <GallerySkeleton columns={columns} />
          ) : !items.length ? (
            filtered ? (
              <EmptyState title="Nothing matches yet" text="Try a different word or category, or pin the first memory for it yourself.">
                <button onClick={clearAll} className="btn-quiet">Clear filters</button>
                <button onClick={openShare} className="btn-primary"><Plus className="h-4 w-4" aria-hidden="true" />Share a memory</button>
              </EmptyState>
            ) : (
              <EmptyState title="The wall is waiting for its first photo" text="Add a picture from campus and tell the story behind it. No account needed.">
                <button onClick={openShare} className="btn-primary"><Plus className="h-4 w-4" aria-hidden="true" />Share a memory</button>
              </EmptyState>
            )
          ) : (
            <div className="flex items-start gap-7 sm:gap-8">
              {cols.map((col, ci) => (
                <div key={ci} className={`flex min-w-0 flex-1 flex-col gap-10 ${ci === 1 ? 'sm:mt-12' : ''} ${ci === 2 ? 'sm:mt-5' : ''}`}>
                  {col.items.map((m) => <MemoryCard key={m.id} memory={m} onOpen={onOpen} onLike={onLike} priority={items.indexOf(m) < 3} />)}
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-12 flex flex-col items-center gap-4 text-center">
              {hasMore ? (
                <>
                  <div ref={sentinel} className="h-px w-full" />
                  {loading ? <Loader2 className="h-6 w-6 animate-spin text-leaf-700" aria-label="Loading more memories" /> : <button onClick={loadMore} className="btn-quiet">Show more memories</button>}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-ink-faint/50 bg-paper/80 px-6 py-5">
                  <p className="font-hand text-3xl text-ink">That's the whole wall, for now.</p>
                  <button onClick={openShare} className="btn-primary mt-3"><Plus className="h-4 w-4" aria-hidden="true" />Add yours</button>
                </div>
              )}
              {error && <p className="text-sm text-alert" role="alert">{error} <button className="font-semibold underline" onClick={loadMore}>Retry</button></p>}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
