const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api`

// A random id kept in this browser. Together with a salted IP hash on the server it stops duplicate likes.
function clientId() {
  try {
    let id = localStorage.getItem('uaf-client-id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('uaf-client-id', id)
    }
    return id
  } catch {
    return (clientId.fallback ||= crypto.randomUUID())
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function friendly(status, detail) {
  if (typeof detail === 'string' && detail) return detail
  if (status === 429) return "You're going a little fast. Please wait a moment and try again."
  if (status === 413) return 'That upload is too large.'
  if (status >= 500) return 'Something went wrong on our side. Please try again shortly.'
  return 'Something went wrong. Please try again.'
}

async function request(path, { method = 'GET', body, admin, signal } = {}) {
  const headers = { 'X-Client-Id': clientId() }
  if (body) headers['Content-Type'] = 'application/json'
  if (admin) headers['X-Admin-Key'] = admin
  let res
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(friendly(res.status, data.detail), res.status)
  return data
}

const qs = (params) => {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== '' && v != null && u.set(k, v))
  const s = u.toString()
  return s ? `?${s}` : ''
}

export const api = {
  listMemories: (params, signal) => request(`/memories${qs(params)}`, { signal }),
  featured: () => request('/memories/featured?limit=5'),
  categories: () => request('/memories/categories'),
  getMemory: (id) => request(`/memories/${id}`),
  setLike: (id, liked) => request(`/memories/${id}/like`, { method: 'PUT', body: { liked } }),
  listComments: (id, page = 1) => request(`/memories/${id}/comments?page=${page}`),
  addComment: (id, body) => request(`/memories/${id}/comments`, { method: 'POST', body }),
  reportMemory: (id, reason) => request(`/memories/${id}/report`, { method: 'POST', body: { reason } }),
  reportComment: (id, reason) => request(`/comments/${id}/report`, { method: 'POST', body: { reason } }),

  // Uses XMLHttpRequest because fetch cannot report upload progress.
  createMemory(form, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE}/memories`)
      xhr.setRequestHeader('X-Client-Id', clientId())
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
      xhr.onerror = () => reject(new ApiError("We couldn't reach the server. Check your connection and try again.", 0))
      xhr.onload = () => {
        let data = {}
        try { data = JSON.parse(xhr.responseText) } catch { /* non-JSON error page */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(new ApiError(friendly(xhr.status, data.detail), xhr.status))
      }
      xhr.send(form)
    })
  },

  admin: {
    check: (key) => request('/admin/check', { admin: key }),
    memories: (key, filter, page = 1) => request(`/admin/memories${qs({ filter, page })}`, { admin: key }),
    comments: (key, filter, page = 1) => request(`/admin/comments${qs({ filter, page })}`, { admin: key }),
    patchMemory: (key, id, body) => request(`/admin/memories/${id}`, { method: 'PATCH', body, admin: key }),
    patchComment: (key, id, body) => request(`/admin/comments/${id}`, { method: 'PATCH', body, admin: key }),
    deleteMemory: (key, id) => request(`/admin/memories/${id}`, { method: 'DELETE', admin: key }),
    deleteComment: (key, id) => request(`/admin/comments/${id}`, { method: 'DELETE', admin: key }),
  },
}
