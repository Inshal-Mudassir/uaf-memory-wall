import { useEffect, useRef, useState } from 'react'
import { Flag, Loader2, Send } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/Toast'
import { cx, initials, timeAgo } from '../lib/utils'

const NAME_KEY = 'uaf-display-name'
const readName = () => { try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' } }

export default function Comments({ memoryId, onAdded }) {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [name, setName] = useState(readName)
  const [anon, setAnon] = useState(() => !readName())
  const [trap, setTrap] = useState('') // honeypot field
  const [posting, setPosting] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    let live = true
    setLoading(true); setError(null); setItems([]); setPage(1)
    api.listComments(memoryId, 1)
      .then((d) => live && (setItems(d.items), setHasMore(d.hasMore)))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false))
    return () => { live = false }
  }, [memoryId])

  const more = async () => {
    setLoading(true)
    try {
      const d = await api.listComments(memoryId, page + 1)
      setItems((p) => [...p, ...d.items.filter((c) => !p.some((x) => x.id === c.id))])
      setHasMore(d.hasMore); setPage(page + 1)
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim() || posting) return
    setPosting(true)
    try {
      const c = await api.addComment(memoryId, { text: text.trim(), authorName: anon ? '' : name.trim(), isAnonymous: anon || !name.trim(), website: trap })
      setItems((p) => [...p, c])
      setText('')
      onAdded?.()
      try { if (!anon && name.trim()) localStorage.setItem(NAME_KEY, name.trim()) } catch { /* private mode */ }
      toast.success('Comment added.')
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    } catch (err) { toast.error(err.message) } finally { setPosting(false) }
  }

  const report = async (c) => {
    if (!window.confirm('Report this comment to the moderators?')) return
    try { const r = await api.reportComment(c.id, 'reported from comment'); toast.success(r.message) } catch (err) { toast.error(err.message) }
  }

  return (
    <>
      <div className="px-5 pb-4 sm:px-7">
        <h3 className="font-display text-xl text-ink">Discussion</h3>
        {error && <p className="mt-3 text-sm text-alert" role="alert">{error}</p>}
        {!error && loading && !items.length && <div className="mt-4 space-y-3" aria-label="Loading comments">{[0, 1].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>}
        {!error && !loading && !items.length && <p className="mt-3 rounded-xl border border-dashed border-paper-edge px-4 py-5 text-center text-sm text-ink-soft">No comments yet. Say what this photo brings back for you.</p>}
        <ul className="mt-4 space-y-4">
          {items.map((c) => (
            <li key={c.id} className="group flex animate-rise gap-3">
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold', c.isAnonymous ? 'border border-dashed border-ink-faint text-ink-faint' : 'bg-leaf-100 text-leaf-800')} aria-hidden="true">{initials(c.author)}</span>
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-white/80 px-3.5 py-2.5 shadow-soft">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cx('truncate text-sm font-semibold text-ink', c.isAnonymous && 'italic font-medium text-ink-soft')}>{c.author}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <time dateTime={c.createdAt} className="text-xs text-ink-faint">{timeAgo(c.createdAt)}</time>
                    <button onClick={() => report(c)} className="rounded p-0.5 text-ink-faint opacity-60 transition hover:text-alert focus:opacity-100 group-hover:opacity-100" aria-label="Report this comment" title="Report this comment"><Flag className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-ink">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
        {hasMore && <button onClick={more} disabled={loading} className="btn-quiet mt-4 !py-1.5 !text-sm">{loading ? 'Loading' : 'Show more comments'}</button>}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="sticky bottom-0 z-10 space-y-2.5 border-t border-paper-edge bg-paper-deep px-5 py-4 sm:px-7" aria-label="Add a comment">
        {/* Honeypot: hidden from people, tempting to bots */}
        <input type="text" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
        <label className="sr-only" htmlFor="comment-text">Your comment</label>
        <textarea id="comment-text" value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={800} placeholder="Add a comment" className="field resize-none" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-4 w-4 accent-leaf-700" />
            Comment anonymously
          </label>
          <label className="sr-only" htmlFor="comment-name">Display name</label>
          <input id="comment-name" value={name} onChange={(e) => setName(e.target.value)} disabled={anon} maxLength={60} placeholder="Display name (optional)" className="field !w-44 !py-1.5 !text-sm" />
          <button type="submit" disabled={posting || !text.trim()} className="btn-primary ml-auto !px-4 !py-2">
            {posting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Post
          </button>
        </div>
      </form>
    </>
  )
}
