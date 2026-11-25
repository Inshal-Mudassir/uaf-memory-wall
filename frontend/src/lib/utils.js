const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatDate = (iso) => dateFmt.format(new Date(iso))

export function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`
  return formatDate(iso)
}

// Small stable number from a string, so each card keeps the same tilt and style between renders.
export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const cx = (...parts) => parts.filter(Boolean).join(' ')

export const initials = (name) =>
  name === 'Anonymous' ? '?' : name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

export function formatBytes(n) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export const memoryUrl = (id) => `${window.location.origin}/m/${id}`

export function aspectOf(image) {
  const ratio = image?.width && image?.height ? image.height / image.width : 0.8
  return Math.min(1.4, Math.max(0.68, ratio)) // keeps very tall or wide photos tidy on the wall
}
