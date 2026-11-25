import { memo, useState } from 'react'
import { Images, MessageCircle } from 'lucide-react'
import LikeButton from './LikeButton'
import { categoryMeta } from '../lib/constants'
import { aspectOf, cx, formatDate, hashString } from '../lib/utils'

// Three ways of pinning a photo to the wall. Chosen per memory from its id, so each card keeps its look.
const VARIANTS = ['polaroid', 'kraft', 'note']

function MemoryCard({ memory, onOpen, onLike, priority = false }) {
  const [loaded, setLoaded] = useState(false)
  const h = hashString(memory.id)
  const variant = VARIANTS[h % 3]
  const rotation = (((h >> 4) % 70) / 10 - 3.5).toFixed(1)
  const meta = categoryMeta(memory.category)
  const img = memory.images[0]
  const ratio = aspectOf(img)
  const caption = memory.title || memory.description
  const showBody = Boolean(memory.title)

  const photo = (
    <button type="button" onClick={() => onOpen(memory)} className="group/photo relative block w-full overflow-hidden rounded-[2px] text-left" aria-label={`Open memory: ${caption.slice(0, 60)}`}>
      <div className={cx('w-full', !loaded && 'skeleton')} style={{ aspectRatio: `1 / ${ratio}` }}>
        <img
          src={img.thumb}
          alt={memory.title ? `${memory.title}. ${memory.description}`.slice(0, 140) : memory.description.slice(0, 140)}
          width={img.width || undefined}
          height={img.height || undefined}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cx('h-full w-full object-cover transition duration-500 group-hover/photo:scale-[1.04]', loaded ? 'opacity-100' : 'opacity-0')}
        />
      </div>
      {memory.isDemo && <span className="absolute left-2 top-2 rounded-sm border border-dashed border-ink-faint bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">Demo</span>}
      {memory.images.length > 1 && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink-soft shadow-soft">
          <Images className="h-3.5 w-3.5" aria-hidden="true" />{memory.images.length}
        </span>
      )}
    </button>
  )

  const captionBlock = (
    <div className={cx(variant === 'note' && 'relative z-10 -mt-7 ml-5 mr-[-6px] rotate-[-1.4deg] bg-note-yellow px-3.5 pb-3 pt-3 shadow-soft')}>
      <p className={cx('font-hand leading-[1.15] text-ink', showBody ? 'line-clamp-2 text-[26px]' : 'line-clamp-3 text-[23px]')}>{caption}</p>
      {showBody && <p className={cx('mt-1 line-clamp-2 text-sm leading-snug', variant === 'note' ? 'text-ink/80' : 'text-ink-soft')}>{memory.description}</p>}
    </div>
  )

  return (
    <article
      style={{ '--r': `${rotation}deg` }}
      className="group relative isolate [transform:rotate(var(--r))] transition duration-300 ease-out hover:z-10 hover:[transform:rotate(0deg)_translateY(-7px)] motion-reduce:transition-none"
    >
      {memory.images.length > 1 && (
        <>
          <div className="absolute inset-0 -z-10 translate-x-2 translate-y-1.5 rotate-[3deg] rounded-[3px] bg-white shadow-frame transition duration-300 group-hover:translate-x-3 group-hover:rotate-[5deg]" aria-hidden="true" />
          <div className="absolute inset-0 -z-20 -translate-x-1.5 translate-y-2 rotate-[-2.5deg] rounded-[3px] bg-paper-deep shadow-frame" aria-hidden="true" />
        </>
      )}
      {variant === 'polaroid' ? <span className="pin" aria-hidden="true" /> : <span className="tape" style={{ '--tape-c': meta.tape, '--tape-r': `${(h % 7) - 3}deg` }} aria-hidden="true" />}

      <div className={cx('rounded-[3px] shadow-frame transition-shadow duration-300 group-hover:shadow-lift', variant === 'kraft' ? 'bg-[#EADBB9] p-3 pb-3' : 'bg-white p-3 pb-3')}>
        <div className={cx(variant === 'kraft' && 'rounded-[2px] border-[5px] border-white/95')}>{photo}</div>
        <div className="px-0.5 pt-3.5">
          {captionBlock}
          <div className="mt-3 flex items-baseline justify-between gap-3 text-[13px] text-ink-soft">
            <span className={cx('truncate', memory.isAnonymous && 'italic')}>{memory.isAnonymous ? 'Anonymous' : `By ${memory.author}`}</span>
            <time dateTime={memory.createdAt} className="shrink-0">{formatDate(memory.createdAt)}</time>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-dashed border-paper-edge pt-2.5">
            <span className={cx('truncate rounded-full px-2.5 py-1 text-xs font-semibold', meta.chip)}>{memory.category}</span>
            <div className="flex shrink-0 items-center">
              <LikeButton memory={memory} onToggle={onLike} />
              <button type="button" onClick={() => onOpen(memory)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-ink-soft transition hover:text-leaf-700" aria-label={`${memory.commentCount} comments. Open discussion`}>
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                <span className="tabular-nums">{memory.commentCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default memo(MemoryCard)
