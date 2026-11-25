import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, Flag, Link2, Share2, X } from 'lucide-react'
import Comments from './Comments'
import LikeButton from './LikeButton'
import Lightbox from './Lightbox'
import EmptyState from './EmptyState'
import { api } from '../lib/api'
import { useToast } from '../context/Toast'
import { useLike } from '../hooks/useLike'
import { useModal } from '../hooks/useModal'
import { categoryMeta } from '../lib/constants'
import { cx, formatDate, memoryUrl } from '../lib/utils'

export default function MemoryModal({ id, initial, onClose, onPatch }) {
  const toast = useToast()
  const panel = useRef(null)
  const [memory, setMemory] = useState(initial || null)
  const [status, setStatus] = useState(initial ? 'ready' : 'loading')
  const [message, setMessage] = useState('')
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)

  useModal(panel, onClose)

  useEffect(() => {
    let live = true
    api.getMemory(id)
      .then((m) => { if (live) { setMemory(m); setStatus('ready') } })
      .catch((e) => { if (live) { setStatus(e.status === 404 ? 'missing' : 'error'); setMessage(e.message) } })
    return () => { live = false }
  }, [id])

  useEffect(() => setIndex(0), [id])

  const sync = useCallback((mid, changes) => {
    setMemory((m) => (m && m.id === mid ? { ...m, ...changes } : m))
    onPatch?.(mid, changes)
  }, [onPatch])
  const toggleLike = useLike(sync)

  const many = memory?.images.length > 1
  const go = useCallback((d) => memory && setIndex((i) => (i + d + memory.images.length) % memory.images.length), [memory])
  useEffect(() => {
    if (!many || zoom) return undefined
    const onKey = (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [many, zoom, go])

  const share = async () => {
    const url = memoryUrl(id)
    const title = memory.title || 'A memory on UAF Memory Wall'
    try {
      if (navigator.share) await navigator.share({ title, text: memory.description.slice(0, 100), url })
      else { await navigator.clipboard.writeText(url); toast.success('Link copied. Paste it anywhere to share this memory.') }
    } catch (e) {
      if (e.name !== 'AbortError') toast.error('Could not share. Copy the link from your address bar instead.')
    }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(memoryUrl(id)); toast.success('Link copied.') } catch { toast.error('Could not copy the link.') }
  }
  const report = async () => {
    if (!window.confirm('Report this memory to the moderators?')) return
    try { const r = await api.reportMemory(id, 'reported from memory view'); toast.success(r.message) } catch (e) { toast.error(e.message) }
  }

  const meta = memory ? categoryMeta(memory.category) : null
  const current = memory?.images[index]

  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-stretch justify-center bg-paper/80 backdrop-blur-md sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={memory?.title || 'Memory'} className="relative flex h-full w-full max-w-6xl animate-rise flex-col overflow-y-auto bg-paper shadow-lift sm:h-[min(92vh,840px)] sm:rounded-3xl sm:border sm:border-paper-edge lg:flex-row lg:overflow-hidden">
        <button data-autofocus onClick={onClose} className="absolute right-3 top-3 z-20 rounded-full bg-white p-2 text-ink shadow-soft hover:bg-paper-deep" aria-label="Close"><X className="h-5 w-5" /></button>

        {status === 'loading' && <div className="flex flex-1 items-center justify-center p-16"><div className="skeleton h-64 w-full max-w-md rounded-xl" role="status" aria-label="Loading memory" /></div>}
        {(status === 'missing' || status === 'error') && (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState title={status === 'missing' ? "This memory isn't here" : "Couldn't open this memory"} text={message}><button onClick={onClose} className="btn-primary">Back to the wall</button></EmptyState>
          </div>
        )}

        {status === 'ready' && memory && (
          <>
            {/* Photo side */}
            <div className="relative flex shrink-0 flex-col items-center justify-center gap-4 bg-paper-deep px-4 py-14 sm:px-8 lg:w-[58%] lg:py-8">
              <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
                <button onClick={() => setZoom(true)} className="group relative max-h-full -rotate-1 cursor-zoom-in bg-white p-2.5 pb-3 shadow-frame transition hover:rotate-0 sm:p-3.5" aria-label="View photo full size">
                  <img key={current.url} src={current.url} alt={memory.title || memory.description.slice(0, 120)} width={current.width || undefined} height={current.height || undefined} className="max-h-[56vh] w-auto max-w-full animate-fade object-contain lg:max-h-[62vh]" />
                  <span className="absolute bottom-5 right-5 rounded-full bg-white/90 p-2 opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true"><Expand className="h-4 w-4" /></span>
                </button>
                {many && (
                  <>
                    <button onClick={() => go(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white p-2.5 shadow-soft hover:bg-paper" aria-label="Previous photo"><ChevronLeft className="h-5 w-5" /></button>
                    <button onClick={() => go(1)} className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white p-2.5 shadow-soft hover:bg-paper" aria-label="Next photo"><ChevronRight className="h-5 w-5" /></button>
                  </>
                )}
              </div>
              {many && (
                <div className="flex max-w-full gap-2 overflow-x-auto p-1 scroll-thin" role="tablist" aria-label="Photos in this memory">
                  {memory.images.map((im, i) => (
                    <button key={im.thumb} role="tab" aria-selected={i === index} onClick={() => setIndex(i)} className={cx('h-14 w-14 shrink-0 overflow-hidden rounded-[3px] border-2 bg-white transition', i === index ? 'border-leaf-700' : 'border-white opacity-70 hover:opacity-100')} aria-label={`Photo ${i + 1} of ${memory.images.length}`}>
                      <img src={im.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Story side */}
            <div className="flex min-h-0 flex-1 flex-col lg:w-[42%]">
              <div className="flex-1 lg:overflow-y-auto scroll-thin">
                <div className="px-5 pb-5 pt-6 sm:px-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', meta.chip)}>{memory.category}</span>
                    {memory.isDemo && <span className="rounded-sm border border-dashed border-ink-faint px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">Demo content</span>}
                  </div>
                  {memory.title && <h2 className="mt-3 font-display text-3xl leading-tight text-ink">{memory.title}</h2>}
                  <p className="mt-2 text-sm text-ink-soft">
                    <span className={cx('font-semibold text-ink', memory.isAnonymous && 'italic font-medium')}>{memory.isAnonymous ? 'Anonymous' : memory.author}</span>
                    <span className="ml-2">{formatDate(memory.createdAt)}</span>
                  </p>
                  <p className={cx('mt-4 whitespace-pre-wrap break-words text-ink', memory.title ? 'text-base leading-relaxed' : 'font-hand text-[28px] leading-[1.2]')}>{memory.description}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <LikeButton memory={memory} onToggle={toggleLike} size="lg" />
                    <button onClick={share} className="btn-quiet !px-4 !py-2"><Share2 className="h-4 w-4" aria-hidden="true" />Share</button>
                    {navigator.share && <button onClick={copy} className="btn-quiet !px-3 !py-2" aria-label="Copy link"><Link2 className="h-4 w-4" /></button>}
                    <button onClick={report} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink-faint transition hover:text-alert"><Flag className="h-4 w-4" aria-hidden="true" />Report</button>
                  </div>
                </div>
                <div className="border-t border-paper-edge pt-5">
                  <Comments memoryId={memory.id} onAdded={() => sync(memory.id, { commentCount: memory.commentCount + 1 })} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {zoom && memory && <Lightbox images={memory.images} index={index} setIndex={setIndex} onClose={() => setZoom(false)} alt={memory.title || memory.description.slice(0, 120)} />}
    </div>
  )
}
