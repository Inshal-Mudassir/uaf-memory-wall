import { CATEGORIES } from '../lib/constants'
import { cx } from '../lib/utils'

export default function CategoriesSection({ counts, total, selected, onSelect }) {
  const pick = (name) => {
    onSelect(name === selected ? '' : name)
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const countOf = (name) => counts?.[name]

  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="max-w-2xl">
        <h2 className="font-display text-4xl text-ink sm:text-5xl">Browse by category</h2>
        <p className="mt-3 text-ink-soft">Pick a corner of university life. The wall below filters to match.</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-x-4 gap-y-5" role="group" aria-label="Memory categories">
        <button
          onClick={() => pick('')}
          aria-pressed={!selected}
          className={cx('relative rounded-[4px] border px-4 py-2.5 text-[15px] font-semibold shadow-soft transition hover:-translate-y-0.5', !selected ? 'border-leaf-800 bg-leaf-700 text-paper' : 'border-paper-edge bg-white text-ink hover:bg-paper')}
        >
          All memories{total != null && <span className="ml-2 tabular-nums opacity-75">{total}</span>}
        </button>
        {CATEGORIES.map((c, i) => {
          const on = selected === c.name
          const n = countOf(c.name)
          return (
            <button
              key={c.name}
              onClick={() => pick(c.name)}
              aria-pressed={on}
              style={{ '--r': `${((i * 37) % 5) - 2}deg` }}
              className={cx('group relative rounded-[4px] border px-4 py-2.5 text-[15px] font-semibold shadow-soft transition [transform:rotate(var(--r))] hover:[transform:rotate(0deg)_translateY(-3px)]', on ? 'border-leaf-800 bg-leaf-700 text-paper' : 'border-paper-edge bg-white text-ink')}
            >
              <span className="absolute -top-2 left-3 h-3.5 w-9 rounded-[2px] opacity-90" style={{ background: c.tape }} aria-hidden="true" />
              {c.name}
              {n != null && <span className={cx('ml-2 tabular-nums', on ? 'opacity-80' : 'text-ink-faint')}>{n}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
