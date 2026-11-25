import { Compass, Plus } from 'lucide-react'
import { useAppUI } from '../context/AppUI'

// Illustrated sample frames (not photographs and not real posts). Real photos replace them on the wall below.
const FRAMES = [
  { src: '/demo-art/campus_sunset.jpg', cap: 'golden hour', style: { left: '0%', top: '3%', width: '46%', '--r': '-5deg' }, aspect: '1 / 1.12', deco: 'tape', delay: 0 },
  { src: '/demo-art/friends_bench.jpg', cap: 'the usual bench', style: { left: '50%', top: '0%', width: '48%', '--r': '4deg' }, aspect: '4 / 3', deco: 'pin', delay: 120 },
  { src: '/demo-art/festival.jpg', cap: 'festival day', style: { left: '53%', top: '39%', width: '44%', '--r': '-3deg' }, aspect: '1 / 1', deco: 'tape', delay: 240 },
  { src: '/demo-art/farewell_gate.jpg', cap: 'last walk out', style: { left: '5%', top: '53%', width: '38%', '--r': '3deg' }, aspect: '4 / 3.4', deco: 'pin', delay: 360 },
]

export default function Hero() {
  const { openShare } = useAppUI()
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:gap-8 lg:pb-24 lg:pt-16">
        <div>
          <h1 className="font-display text-[clamp(2.5rem,6.2vw,4.6rem)] leading-[1.05] text-ink">
            <span className="block">Your University.</span>
            <span className="block">Your Stories.</span>
            <span className="block">Your Memories.</span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
            From unforgettable friendships to random campus moments, every memory deserves a place on our wall.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={openShare} className="btn-primary !px-6 !py-3 !text-base"><Plus className="h-5 w-5" aria-hidden="true" />Share Your Memory</button>
            <a href="#explore" className="btn-quiet !px-6 !py-3 !text-base"><Compass className="h-5 w-5" aria-hidden="true" />Explore Memories</a>
          </div>
          <p className="mt-6 font-hand text-2xl text-leaf-700">No sign-up. No account. Just your photos and your words.</p>
        </div>

        {/* Collage */}
        <div className="relative mx-auto w-full max-w-[540px]" style={{ aspectRatio: '1 / 1.08' }} aria-hidden="true">
          {FRAMES.map((f, i) => (
            <figure key={f.src} className="absolute animate-drop bg-white p-[2.2%] pb-[5%] shadow-frame" style={{ ...f.style, transform: 'rotate(var(--r))', animationDelay: `${f.delay}ms`, zIndex: i + 1 }}>
              {f.deco === 'tape' ? <span className="tape" style={{ '--tape-c': i % 2 ? '#F4E4A1' : '#CFDDE2' }} /> : <span className="pin" />}
              <img src={f.src} alt="" className="w-full object-cover" style={{ aspectRatio: f.aspect }} loading={i < 2 ? 'eager' : 'lazy'} />
              <figcaption className="mt-1.5 font-hand text-[clamp(1rem,2.2vw,1.35rem)] leading-none text-ink-soft">{f.cap}</figcaption>
            </figure>
          ))}
          <div className="absolute animate-drop bg-note-yellow p-3 pt-4 shadow-frame" style={{ left: '46%', top: '82%', width: '30%', '--r': '-6deg', transform: 'rotate(var(--r))', animationDelay: '520ms', zIndex: 8 }}>
            <p className="font-hand text-[clamp(1.1rem,2.6vw,1.6rem)] leading-[1.05] text-ink">Pin yours next. It takes a minute.</p>
          </div>
          <div className="absolute right-0 top-[93%] -translate-y-1/2 rotate-2 rounded-sm border border-dashed border-ink-faint/60 bg-paper px-2 py-0.5 text-[11px] text-ink-faint" style={{ zIndex: 9 }}>
            illustrated samples
          </div>
        </div>
      </div>
    </section>
  )
}
