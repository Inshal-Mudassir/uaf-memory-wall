import { Heart, MessageCircle } from 'lucide-react'
import { categoryMeta } from '../lib/constants'
import { aspectOf, cx, hashString } from '../lib/utils'

function Tile({ memory, big, onOpen }) {
  const h = hashString(memory.id)
  const meta = categoryMeta(memory.category)
  const img = memory.images[0]
  const rot = (((h >> 3) % 40) / 10 - 2).toFixed(1)
  return (
    <button
      type="button"
      onClick={() => onOpen(memory)}
      style={{ '--r': `${rot}deg` }}
      className={cx('group relative flex flex-col text-left [transform:rotate(var(--r))] transition duration-300 hover:[transform:rotate(0deg)_translateY(-6px)]', big && 'lg:col-span-2 lg:row-span-2')}
      aria-label={`Open featured memory: ${memory.title || memory.description.slice(0, 60)}`}
    >
      <span className="tape" style={{ '--tape-c': meta.tape }} aria-hidden="true" />
      <span className={cx('flex flex-1 flex-col rounded-[3px] bg-white p-2.5 shadow-frame transition-shadow group-hover:shadow-lift', big && 'sm:p-3.5')}>
        <span className="relative block flex-1 overflow-hidden rounded-[2px] bg-paper-deep">
          <img
            src={img.thumb}
            alt={memory.title || memory.description.slice(0, 100)}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={{ aspectRatio: big ? '1 / 1' : `1 / ${Math.min(aspectOf(img), 1.05)}`, minHeight: big ? undefined : 0 }}
          />
          {memory.isDemo && <span className="absolute left-2 top-2 rounded-sm border border-dashed border-ink-faint bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">Demo</span>}
        </span>
        <span className="mt-3 block px-0.5">
          <span className={cx('line-clamp-2 block font-hand leading-[1.1] text-ink', big ? 'text-[32px]' : 'text-[24px]')}>{memory.title || memory.description}</span>
          <span className="mt-1.5 flex items-center justify-between text-[13px] text-ink-soft">
            <span className={cx('truncate', memory.isAnonymous && 'italic')}>{memory.isAnonymous ? 'Anonymous' : memory.author}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" aria-hidden="true" />{memory.likes}</span>
              <span className="inline-flex items-center gap-1"><MessageCircle className="h-4 w-4" aria-hidden="true" />{memory.commentCount}</span>
            </span>
          </span>
        </span>
      </span>
    </button>
  )
}

export default function FeaturedSection({ items, onOpen }) {
  if (!items.length) return null
  return (
    <section id="featured" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="font-display text-4xl text-ink sm:text-5xl">Moments worth a second look</h2>
        <p className="mt-3 text-ink-soft">The memories people liked and talked about most. This corner updates as the wall grows.</p>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4 lg:gap-x-8">
        {items.map((m, i) => <Tile key={m.id} memory={m} big={i === 0 && items.length > 2} onOpen={onOpen} />)}
      </div>
    </section>
  )
}
