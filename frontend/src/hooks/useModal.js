import { useEffect } from 'react'

/** Locks page scroll, handles Escape, keeps Tab inside the dialog, and restores focus on close. */
export function useModal(panelRef, onClose, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined
    const previous = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = panelRef.current
    panel?.querySelector('[data-autofocus]')?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key !== 'Tab' || !panel) return
      const nodes = [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null)
      if (!nodes.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previous?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
