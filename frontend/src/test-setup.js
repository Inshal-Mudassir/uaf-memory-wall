// Browser APIs jsdom does not provide.
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
window.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}
window.confirm = () => true
// Point relative API calls at a running backend (cd backend && uvicorn app.main:app).
const target = process.env.TEST_API || 'http://localhost:8000'
const real = globalThis.fetch
globalThis.fetch = (url, opts) => real(typeof url === 'string' && url.startsWith('/') ? target + url : url, opts)
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}
// jsdom's XMLHttpRequest also needs the backend origin for the upload call.
const realOpen = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  return realOpen.call(this, method, typeof url === 'string' && url.startsWith('/') ? target + url : url, ...rest)
}
