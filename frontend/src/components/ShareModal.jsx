import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ImagePlus, Link2, Loader2, Trash2, UploadCloud, X } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/Toast'
import { useModal } from '../hooks/useModal'
import { CATEGORIES, UPLOAD } from '../lib/constants'
import { cx, formatBytes, memoryUrl } from '../lib/utils'

const emptyForm = { title: '', description: '', category: '', name: '', anon: false }

export default function ShareModal({ onClose, onCreated, onView }) {
  const toast = useToast()
  const panel = useRef(null)
  const input = useRef(null)
  const [form, setForm] = useState(emptyForm)
  const [files, setFiles] = useState([]) // {id, file, url}
  const [problems, setProblems] = useState([]) // image validation messages
  const [errors, setErrors] = useState({})
  const [trap, setTrap] = useState('') // honeypot
  const [drag, setDrag] = useState(false)
  const [phase, setPhase] = useState('form') // form | uploading | done
  const [progress, setProgress] = useState(0)
  const [created, setCreated] = useState(null)
  const [serverError, setServerError] = useState('')
  const uploading = phase === 'uploading'

  const guardedClose = () => { if (!uploading) onClose() }
  useModal(panel, guardedClose)

  const filesRef = useRef(files)
  filesRef.current = files
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const addFiles = (list) => {
    const incoming = [...list]
    const msgs = []
    const accepted = []
    let room = UPLOAD.maxFiles - files.length
    for (const file of incoming) {
      if (!UPLOAD.types.includes(file.type)) { msgs.push(`“${file.name}” isn't a JPG, PNG or WebP image.`); continue }
      if (file.size > UPLOAD.maxMb * 1024 * 1024) { msgs.push(`“${file.name}” is ${formatBytes(file.size)}. The limit is ${UPLOAD.maxMb} MB per photo.`); continue }
      if (room <= 0) { msgs.push(`You can add up to ${UPLOAD.maxFiles} photos. “${file.name}” was left out.`); continue }
      room -= 1
      accepted.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })
    }
    setProblems(msgs)
    if (accepted.length) { setFiles((f) => [...f, ...accepted]); setErrors((e) => ({ ...e, files: undefined })) }
  }

  const remove = (id) => {
    setFiles((f) => { const x = f.find((i) => i.id === id); if (x) URL.revokeObjectURL(x.url); return f.filter((i) => i.id !== id) })
    setProblems([])
  }

  const validate = () => {
    const e = {}
    if (!files.length) e.files = 'Add at least one photo.'
    if (form.description.trim().length < 3) e.description = 'Tell us a little about this memory.'
    if (!form.category) e.category = 'Choose a category.'
    setErrors(e)
    return !Object.keys(e).length
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (uploading || !validate()) return
    const body = new FormData()
    body.append('description', form.description.trim())
    body.append('category', form.category)
    body.append('title', form.title.trim())
    body.append('isAnonymous', String(form.anon))
    body.append('authorName', form.anon ? '' : form.name.trim())
    body.append('website', trap)
    files.forEach((f) => body.append('images', f.file, f.file.name))
    setServerError(''); setProgress(0); setPhase('uploading')
    try {
      const memory = await api.createMemory(body, setProgress)
      setCreated(memory); setPhase('done'); onCreated(memory)
      toast.success('Your memory is on the wall.')
    } catch (err) {
      setPhase('form'); setServerError(err.message); toast.error(err.message)
    }
  }

  const again = () => {
    files.forEach((f) => URL.revokeObjectURL(f.url))
    setFiles([]); setForm(emptyForm); setProblems([]); setErrors({}); setCreated(null); setPhase('form'); setProgress(0)
  }
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(memoryUrl(created.id)); toast.success('Link copied.') } catch { toast.error('Could not copy the link.') }
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-stretch justify-center bg-paper/80 backdrop-blur-md sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && guardedClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="share-title" className="relative flex h-full w-full max-w-2xl animate-rise flex-col overflow-hidden bg-paper shadow-lift sm:h-auto sm:max-h-[94vh] sm:rounded-3xl sm:border sm:border-paper-edge">
        <header className="flex items-start justify-between gap-4 border-b border-paper-edge px-5 py-4 sm:px-7">
          <div>
            <h2 id="share-title" className="font-display text-2xl text-ink">{phase === 'done' ? 'Pinned to the wall' : 'Share a memory'}</h2>
            {phase !== 'done' && <p className="text-sm text-ink-soft">No account needed. Add photos and a few words.</p>}
          </div>
          <button data-autofocus onClick={guardedClose} disabled={uploading} className="rounded-full p-2 text-ink-soft hover:bg-paper-deep disabled:opacity-40" aria-label="Close"><X className="h-5 w-5" /></button>
        </header>

        {phase === 'done' && created ? (
          <div className="flex-1 overflow-y-auto px-5 py-8 text-center sm:px-7">
            <CheckCircle2 className="mx-auto h-12 w-12 text-leaf-600" aria-hidden="true" />
            <p className="mt-3 font-display text-2xl text-ink">Thank you for sharing</p>
            <p className="mx-auto mt-1 max-w-sm text-ink-soft">Your memory is live. Send the link to the friends who were there.</p>
            <div className="mx-auto mt-6 w-44 -rotate-2 bg-white p-2.5 pb-3 shadow-frame">
              <img src={created.images[0].thumb} alt="Your photo" className="aspect-square w-full object-cover" />
              <p className="mt-2 truncate font-hand text-xl text-ink">{created.title || created.description}</p>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => onView(created.id)} className="btn-primary">View your memory</button>
              <button onClick={copyLink} className="btn-quiet"><Link2 className="h-4 w-4" aria-hidden="true" />Copy link</button>
              <button onClick={again} className="btn-quiet">Share another</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7 scroll-thin">
              {/* Photos */}
              <div>
                <span className="label" id="photos-label">Photos</span>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
                  className={cx('rounded-2xl border-2 border-dashed p-4 transition', drag ? 'border-leaf-600 bg-leaf-50' : errors.files ? 'border-alert/60 bg-note-blush/30' : 'border-paper-edge bg-white/50')}
                >
                  {files.length > 0 && (
                    <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {files.map((f, i) => (
                        <li key={f.id} className="relative bg-white p-1.5 pb-2 shadow-soft" style={{ transform: `rotate(${((i * 53) % 5) - 2}deg)` }}>
                          <img src={f.url} alt={`Preview of ${f.file.name}`} className="aspect-square w-full object-cover" />
                          <p className="mt-1 truncate text-[11px] text-ink-faint">{formatBytes(f.file.size)}</p>
                          <button type="button" onClick={() => remove(f.id)} disabled={uploading} className="absolute -right-2 -top-2 rounded-full bg-white p-1.5 text-alert shadow-soft hover:bg-note-blush" aria-label={`Remove ${f.file.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" onClick={() => input.current?.click()} aria-labelledby="photos-label" disabled={files.length >= UPLOAD.maxFiles} className="flex w-full flex-col items-center gap-1 rounded-xl py-4 text-center transition hover:bg-paper-deep/60 disabled:opacity-50">
                    {files.length ? <ImagePlus className="h-7 w-7 text-leaf-600" aria-hidden="true" /> : <UploadCloud className="h-8 w-8 text-leaf-600" aria-hidden="true" />}
                    <span className="font-semibold text-ink">{files.length ? 'Add more photos' : 'Choose photos or drop them here'}</span>
                    <span className="text-sm text-ink-soft">JPG, PNG or WebP. Up to {UPLOAD.maxFiles} photos, {UPLOAD.maxMb} MB each.</span>
                  </button>
                  <input ref={input} type="file" accept={UPLOAD.types.join(',')} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                </div>
                {errors.files && <p className="mt-2 text-sm text-alert" role="alert">{errors.files}</p>}
                {problems.length > 0 && <ul className="mt-2 space-y-1 text-sm text-alert" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
                <p className="mt-2 text-xs text-ink-faint">Location data stored inside photos is removed when you upload.</p>
              </div>

              <div>
                <label className="label" htmlFor="m-title">Title <span className="font-normal text-ink-faint">(optional)</span></label>
                <input id="m-title" value={form.title} onChange={set('title')} maxLength={100} placeholder="Give it a name" className="field" />
              </div>

              <div>
                <label className="label" htmlFor="m-desc">The story</label>
                <textarea id="m-desc" value={form.description} onChange={set('description')} rows={4} maxLength={2000} placeholder="Where was this, who was there, and why does it stay with you?" className={cx('field resize-y', errors.description && '!border-alert')} aria-invalid={Boolean(errors.description)} />
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-alert" role={errors.description ? 'alert' : undefined}>{errors.description}</span>
                  <span className="text-ink-faint tabular-nums">{form.description.length} / 2000</span>
                </div>
              </div>

              <fieldset>
                <legend className="label">Category</legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button type="button" key={c.name} onClick={() => { setForm((f) => ({ ...f, category: c.name })); setErrors((e) => ({ ...e, category: undefined })) }} aria-pressed={form.category === c.name} className={cx('rounded-full border px-3.5 py-1.5 text-sm font-semibold transition', form.category === c.name ? 'border-leaf-800 bg-leaf-700 text-paper' : 'border-paper-edge bg-white/70 text-ink hover:bg-white')}>{c.name}</button>
                  ))}
                </div>
                {errors.category && <p className="mt-2 text-sm text-alert" role="alert">{errors.category}</p>}
              </fieldset>

              <div className="rounded-2xl border border-paper-edge bg-white/60 p-4">
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span>
                    <span className="block font-semibold text-ink">Post anonymously</span>
                    <span className="block text-sm text-ink-soft">Your name will not be shown. We don't ask for an email or any account details.</span>
                  </span>
                  <input type="checkbox" role="switch" checked={form.anon} onChange={set('anon')} className="peer sr-only" />
                  <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-paper-edge transition peer-checked:bg-leaf-700 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf-600 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                </label>
                <div className="mt-4">
                  <label className="label" htmlFor="m-name">Your name <span className="font-normal text-ink-faint">(optional)</span></label>
                  <input id="m-name" value={form.anon ? '' : form.name} onChange={set('name')} disabled={form.anon} maxLength={60} placeholder={form.anon ? 'Posting as Anonymous' : 'Leave empty to post as Anonymous'} className="field" autoComplete="off" />
                </div>
              </div>

              <input type="text" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
              {serverError && <p className="rounded-xl border border-alert/30 bg-note-blush/50 px-4 py-3 text-sm text-alert" role="alert">{serverError}</p>}
            </div>

            <footer className="border-t border-paper-edge bg-paper-deep/60 px-5 py-4 sm:px-7">
              {uploading && (
                <div className="mb-3" role="status" aria-live="polite">
                  <div className="mb-1 flex justify-between text-sm font-semibold text-ink-soft">
                    <span>{progress < 100 ? 'Uploading your photos' : 'Pinning your memory'}</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper-edge"><div className="h-full rounded-full bg-leaf-600 transition-all duration-200" style={{ width: `${progress}%` }} /></div>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={guardedClose} disabled={uploading} className="btn-quiet">Cancel</button>
                <button type="submit" disabled={uploading} className="btn-primary min-w-[9rem]">
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Posting</> : 'Post to the wall'}
                </button>
              </div>
            </footer>
          </form>
        )}
      </div>
    </div>
  )
}
