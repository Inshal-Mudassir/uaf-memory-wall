import { useCallback, useMemo, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ShareModal from './components/ShareModal'
import Home from './pages/Home'
import Admin from './pages/Admin'
import { AppUI } from './context/AppUI'

export default function App() {
  const navigate = useNavigate()
  const [shareOpen, setShareOpen] = useState(false)
  const [createdMemory, setCreatedMemory] = useState(null)
  const openShare = useCallback(() => setShareOpen(true), [])
  const ui = useMemo(() => ({ openShare, createdMemory }), [openShare, createdMemory])

  return (
    <AppUI.Provider value={ui}>
      <a href="#explore" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">Skip to the wall</a>
      <Navbar />
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/*" element={<Home />} />
      </Routes>
      <Footer />
      {shareOpen && (
        <ShareModal
          onClose={() => setShareOpen(false)}
          onCreated={setCreatedMemory}
          onView={(id) => { setShareOpen(false); navigate(`/m/${id}`) }}
        />
      )}
    </AppUI.Provider>
  )
}
