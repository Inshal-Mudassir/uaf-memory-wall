import { Heart } from 'lucide-react'
import { cx } from '../lib/utils'

export default function LikeButton({ memory, onToggle, size = 'sm' }) {
  const big = size === 'lg'
  return (
    <button
      type="button"
      onClick={() => onToggle(memory)}
      aria-pressed={memory.likedByMe}
      aria-label={memory.likedByMe ? `Unlike. ${memory.likes} likes` : `Like. ${memory.likes} likes`}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full font-semibold transition',
        big ? 'border border-paper-edge px-4 py-2 text-[15px]' : 'px-2 py-1 text-sm',
        memory.likedByMe ? 'text-alert' : 'text-ink-soft hover:text-alert',
        big && memory.likedByMe && 'border-alert/30 bg-note-blush/50',
      )}
    >
      <Heart key={String(memory.likedByMe)} className={cx(big ? 'h-5 w-5' : 'h-[18px] w-[18px]', memory.likedByMe && 'animate-pop fill-current')} aria-hidden="true" />
      <span className="tabular-nums">{memory.likes}</span>
    </button>
  )
}
