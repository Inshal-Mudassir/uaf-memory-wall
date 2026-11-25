import { Camera, HeartHandshake, ShieldCheck } from 'lucide-react'

const NOTES = [
  { icon: Camera, bg: 'bg-note-yellow', rot: '-rotate-2', title: 'Pin a photo', text: 'Upload up to six pictures and tell the story behind them. You never need an account.' },
  { icon: ShieldCheck, bg: 'bg-note-sage', rot: 'rotate-1', title: 'Your name is your choice', text: 'Post as Anonymous and your name is not shown on the wall. Our hosting may still keep standard technical logs, so it is not absolute secrecy.' },
  { icon: HeartHandshake, bg: 'bg-note-sky', rot: '-rotate-1', title: 'Keep it kind', text: 'Anyone can report a memory or comment. Moderators remove anything inappropriate.' },
]

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <h2 className="font-display text-4xl text-ink sm:text-5xl">About the wall</h2>
          <p className="mt-6 max-w-xl font-display text-2xl leading-snug text-leaf-800">
            This wall is built to preserve the little moments that make university life unforgettable.
          </p>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            Every photograph, every friendship, every random moment becomes part of our shared university story.
          </p>
        </div>
        <ul className="grid gap-6 sm:grid-cols-3 lg:gap-5">
          {NOTES.map(({ icon: Icon, bg, rot, title, text }) => (
            <li key={title} className={`${bg} ${rot} relative p-5 shadow-frame transition hover:rotate-0`}>
              <span className="pin" aria-hidden="true" />
              <Icon className="h-6 w-6 text-leaf-800" aria-hidden="true" />
              <h3 className="mt-3 font-hand text-[28px] leading-none text-ink">{title}</h3>
              <p className="mt-2 text-[14.5px] leading-snug text-ink/85">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
