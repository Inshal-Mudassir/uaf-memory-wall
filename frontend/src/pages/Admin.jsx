import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogOut, ShieldCheck, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/Toast'
import { cx, formatDate } from '../lib/utils'

const KEY = 'uaf-admin-key'
const read = () => { try { return sessionStorage.getItem(KEY) || '' } catch { return '' } }

function Badge({ children, tone = 'plain' }) {
  return <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', tone === 'warn' ? 'bg-note-blush text-alert' : tone === 'hidden' ? 'bg-paper-edge text-ink-soft' : 'bg-leaf-100 text-leaf-800')}>{children}</span>
}

function Login({ onDone }) {
  const toast = useToast()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api.admin.check(key); try { sessionStorage.setItem(KEY, key) } catch { /* private mode */ } onDone(key) } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm rounded-2xl border border-paper-edge bg-white/80 p-6 shadow-frame">
      <ShieldCheck className="h-8 w-8 text-leaf-700" aria-hidden="true" />
      <h1 className="mt-3 font-display text-2xl">Moderation</h1>
      <p className="mt-1 text-sm text-ink-soft">Enter the moderation key set on the server. It stays in this browser tab only.</p>
      <label className="label mt-5" htmlFor="adm">Moderation key</label>
      <input id="adm" type="password" value={key} onChange={(e) => setKey(e.target.value)} className="field" autoComplete="off" />
      <button className="btn-primary mt-4 w-full" disabled={!key || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}</button>
    </form>
  )
}

export default function Admin() {
  const toast = useToast()
  const [key, setKey] = useState(read)
  const [tab, setTab] = useState('memories')
  const [filter, setFilter] = useState('reported')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)

  const logout = useCallback(() => { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } setKey('') }, [])
  const fail = useCallback((e) => { if (e.status === 401) { logout(); toast.error('That key was not accepted.') } else toast.error(e.message) }, [logout, toast])

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const d = await (tab === 'memories' ? api.admin.memories : api.admin.comments)(key, filter, p)
      setItems((prev) => (p === 1 ? d.items : [...prev, ...d.items])); setTotal(d.total); setHasMore(d.hasMore); setPage(p)
    } catch (e) { fail(e) } finally { setLoading(false) }
  }, [tab, filter, key, fail])

  useEffect(() => { if (key) load(1) }, [key, load])

  const patchItem = (id, next) => setItems((p) => p.map((x) => (x.id === id ? next : x)))
  const dropItem = (id) => { setItems((p) => p.filter((x) => x.id !== id)); setTotal((t) => Math.max(0, t - 1)) }

  const act = async (kind, item, body) => {
    const isMem = tab === 'memories'
    try {
      if (kind === 'delete') {
        if (!window.confirm(isMem ? 'Delete this memory, its photos and comments permanently?' : 'Delete this comment permanently?')) return
        await (isMem ? api.admin.deleteMemory : api.admin.deleteComment)(key, item.id)
        dropItem(item.id); toast.success('Deleted.')
      } else {
        patchItem(item.id, await (isMem ? api.admin.patchMemory : api.admin.patchComment)(key, item.id, body))
        toast.success('Updated.')
      }
    } catch (e) { fail(e) }
  }

  if (!key) return <main className="px-4"><Login onDone={setKey} /></main>

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Moderation</h1>
        <div className="flex gap-2"><Link to="/" className="btn-quiet !py-2">Back to the wall</Link><button onClick={logout} className="btn-quiet !py-2"><LogOut className="h-4 w-4" aria-hidden="true" />Lock</button></div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-paper-edge bg-white/70 p-1" role="tablist">
          {['memories', 'comments'].map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('rounded-full px-4 py-1.5 text-sm font-semibold capitalize', tab === t ? 'bg-leaf-700 text-paper' : 'text-ink-soft')}>{t}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">Show
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="field !w-auto !py-1.5">
            <option value="reported">Reported or hidden</option><option value="hidden">Hidden only</option><option value="all">Everything</option>
          </select>
        </label>
        <span className="text-sm text-ink-soft">{total} found</span>
      </div>

      <ul className="mt-6 space-y-4">
        {items.map((it) => (
          <li key={it.id} className="flex flex-col gap-4 rounded-2xl border border-paper-edge bg-white/80 p-4 shadow-soft sm:flex-row">
            {tab === 'memories' && <img src={it.images[0]?.thumb} alt="" className="h-28 w-28 shrink-0 rounded-md object-cover" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {tab === 'memories' && <Badge>{it.category}</Badge>}
                {it.isHidden && <Badge tone="hidden">Hidden</Badge>}
                {it.reportCount > 0 && <Badge tone="warn">{it.reportCount} {it.reportCount === 1 ? 'report' : 'reports'}</Badge>}
                {it.isDemo && <Badge>Demo</Badge>}
              </div>
              {it.title && <p className="mt-2 font-semibold">{it.title}</p>}
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-ink-soft">{tab === 'memories' ? it.description : it.text}</p>
              <p className="mt-2 text-xs text-ink-faint">{it.author}, {formatDate(it.createdAt)}</p>
            </div>
            <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:w-40 sm:flex-col">
              <button onClick={() => act('patch', it, { isHidden: !it.isHidden })} className="btn-quiet !py-1.5 !text-sm">{it.isHidden ? <><Eye className="h-4 w-4" />Restore</> : <><EyeOff className="h-4 w-4" />Hide</>}</button>
              {it.reportCount > 0 && <button onClick={() => act('patch', it, { dismissReports: true })} className="btn-quiet !py-1.5 !text-sm">Clear reports</button>}
              <button onClick={() => act('delete', it)} className="btn !py-1.5 !text-sm border border-alert/40 text-alert hover:bg-note-blush"><Trash2 className="h-4 w-4" />Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && !items.length && <p className="mt-10 text-center text-ink-soft">Nothing to review here.</p>}
      {loading && <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-leaf-700" /></div>}
      {hasMore && !loading && <div className="mt-6 text-center"><button className="btn-quiet" onClick={() => load(page + 1)}>Show more</button></div>}
    </main>
  )
}
