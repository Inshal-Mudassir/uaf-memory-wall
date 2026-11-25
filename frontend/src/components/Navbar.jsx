import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Plus, X } from 'lucide-react'
import Logo from './Logo'
import { useAppUI } from '../context/AppUI'

const LINKS = [
  { label: 'Home', hash: '#top' },
  { label: 'Explore Memories', hash: '#explore' },
  { label: 'Categories', hash: '#categories' },
  { label: 'About', hash: '#about' },
]

export default function Navbar() {
  const { openShare } = useAppUI()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const base = pathname === '/admin' ? '/' : '' // from the admin page, links go back to the home page
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-paper-edge/80 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="UAF Memory Wall home"><Logo /></Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.hash} href={`${base}${l.hash}`} className="rounded-full px-3.5 py-2 text-[15px] font-medium text-ink-soft transition hover:bg-paper-deep hover:text-ink">{l.label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={openShare} className="btn-primary !px-4 sm:!px-5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden min-[420px]:inline">Share a Memory</span>
            <span className="min-[420px]:hidden">Share</span>
          </button>
          <button className="btn-quiet !px-3 md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="animate-fade border-t border-paper-edge bg-paper px-4 pb-4 pt-2 md:hidden">
          {LINKS.map((l) => (
            <a key={l.hash} href={`${base}${l.hash}`} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-paper-deep">{l.label}</a>
          ))}
        </nav>
      )}
    </header>
  )
}
