import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="border-t border-paper-edge bg-paper-deep/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 font-hand text-[26px] leading-tight text-leaf-800">Every picture has a story. Every story deserves a place.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-[15px] text-ink-soft">
          <a href="/#top" className="hover:text-ink">Home</a>
          <a href="/#categories" className="hover:text-ink">Categories</a>
          <a href="/#explore" className="hover:text-ink">Explore memories</a>
          <a href="/#about" className="hover:text-ink">About</a>
        </nav>
        <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
          Photos and stories belong to the people who shared them. Something shouldn't be here? Use the report button on any memory.
        </p>
      </div>
      <div className="border-t border-paper-edge py-4 text-center text-xs text-ink-faint">
        <span>UAF Memory Wall: a digital home for university memories.</span>
        <Link to="/admin" className="ml-3 underline-offset-2 hover:underline">Moderation</Link>
      </div>
    </footer>
  )
}
