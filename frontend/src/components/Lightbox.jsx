import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function Lightbox({ images, index, setIndex, onClose, alt }) {
  const many = images.length > 1
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (!many) return
      if (e.key === 'ArrowRight') setIndex((index + 1) % images.length)
      if (e.key === 'ArrowLeft') setIndex((index - 1 + images.length) % images.length)
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [index, images.length, many, onClose, setIndex])

  return (
    <div className="fixed inset-0 z-[70] flex animate-fade items-center justify-center bg-paper/95 p-3 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true" aria-label="Full-size photo" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white p-2.5 text-ink shadow-soft hover:bg-paper-deep" aria-label="Close full-size photo"><X className="h-5 w-5" /></button>
      {many && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setIndex((index - 1 + images.length) % images.length) }} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 text-ink shadow-soft hover:bg-paper-deep" aria-label="Previous photo"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={(e) => { e.stopPropagation(); setIndex((index + 1) % images.length) }} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 text-ink shadow-soft hover:bg-paper-deep" aria-label="Next photo"><ChevronRight className="h-5 w-5" /></button>
        </>
      )}
      <img src={images[index].url} alt={alt} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-[3px] bg-white object-contain p-2 shadow-lift sm:p-3" />
      {many && <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink-soft shadow-soft">{index + 1} of {images.length}</span>}
    </div>
  )
}
