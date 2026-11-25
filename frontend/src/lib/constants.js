// Each category gets its own tape / tag colour so the wall feels hand-sorted.
export const CATEGORIES = [
  { name: 'Campus Life', tape: '#CFDDE2', chip: 'bg-note-sky text-[#2D4A55]' },
  { name: 'Friends & Memories', tape: '#EFD5CB', chip: 'bg-note-blush text-[#6B3F33]' },
  { name: 'University Events', tape: '#F4E4A1', chip: 'bg-note-yellow text-[#5E4F12]' },
  { name: 'Classrooms & Lectures', tape: '#D3E0C8', chip: 'bg-note-sage text-[#2F5D46]' },
  { name: 'Farewell Moments', tape: '#E3D3E8', chip: 'bg-[#E8DCEC] text-[#573E63]' },
  { name: 'University Festivals', tape: '#F3D9A4', chip: 'bg-[#F4E0B5] text-[#6A4A10]' },
  { name: 'Funny Moments', tape: '#F4E4A1', chip: 'bg-note-yellow text-[#5E4F12]' },
  { name: 'Trips & Adventures', tape: '#CFDDE2', chip: 'bg-note-sky text-[#2D4A55]' },
  { name: 'Graduation', tape: '#D3E0C8', chip: 'bg-note-sage text-[#2F5D46]' },
  { name: 'Random Memories', tape: '#EFD5CB', chip: 'bg-note-blush text-[#6B3F33]' },
]

export const categoryMeta = (name) => CATEGORIES.find((c) => c.name === name) || CATEGORIES[0]

export const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'popular', label: 'Most liked' },
]

export const UPLOAD = {
  maxFiles: 6,
  maxMb: 8,
  types: ['image/jpeg', 'image/png', 'image/webp'],
}
