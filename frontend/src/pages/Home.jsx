import { useCallback, useEffect, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import Hero from '../components/Hero'
import FeaturedSection from '../components/FeaturedSection'
import CategoriesSection from '../components/CategoriesSection'
import Gallery from '../components/Gallery'
import About from '../components/About'
import MemoryModal from '../components/MemoryModal'
import { useFeed } from '../hooks/useFeed'
import { useLike } from '../hooks/useLike'
import { useAppUI } from '../context/AppUI'
import { api } from '../lib/api'

export default function Home() {
  const { createdMemory } = useAppUI()
  const navigate = useNavigate()
  const open = useMatch('/m/:id')
  const [filters, setFilters] = useState({ q: '', category: '', sort: 'newest' })
  const feed = useFeed(filters)
  const [featured, setFeatured] = useState([])
  const [cats, setCats] = useState({ total: null, counts: null })

  const refreshSide = useCallback(() => {
    api.featured().then((d) => setFeatured(d.items)).catch(() => {})
    api.categories().then((d) => setCats({ total: d.total, counts: Object.fromEntries(d.items.map((c) => [c.name, c.count])) })).catch(() => {})
  }, [])
  useEffect(refreshSide, [refreshSide])

  // Keep every copy of a memory (wall, featured, open modal) in step.
  const { patch } = feed
  const patchAll = useCallback((id, changes) => {
    patch(id, changes)
    setFeatured((f) => f.map((m) => (m.id === id ? { ...m, ...changes } : m)))
  }, [patch])
  const like = useLike(patchAll)

  // A memory was just posted: show it at the top if it fits the current filters.
  const seen = useRef(null)
  useEffect(() => {
    if (!createdMemory || seen.current === createdMemory.id) return
    seen.current = createdMemory.id
    const fits = !filters.q && (!filters.category || filters.category === createdMemory.category) && filters.sort !== 'oldest'
    if (fits) feed.prepend(createdMemory)
    refreshSide()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdMemory])

  const openMemory = useCallback((m) => navigate(`/m/${m.id}`), [navigate])
  const id = open?.params.id
  const initial = id ? feed.items.find((m) => m.id === id) || featured.find((m) => m.id === id) : null

  return (
    <main>
      <Hero />
      <FeaturedSection items={featured} onOpen={openMemory} />
      <CategoriesSection counts={cats.counts} total={cats.total} selected={filters.category} onSelect={(category) => setFilters((f) => ({ ...f, category }))} />
      <Gallery feed={feed} filters={filters} setFilters={setFilters} onOpen={openMemory} onLike={like} />
      <About />
      {id && <MemoryModal key={id} id={id} initial={initial} onClose={() => navigate('/')} onPatch={patchAll} />}
    </main>
  )
}
