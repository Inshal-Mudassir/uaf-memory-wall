import { useEffect, useState } from 'react'

const count = () => (window.innerWidth < 560 ? 1 : window.innerWidth < 940 ? 2 : 3)

export function useColumnCount() {
  const [n, setN] = useState(count)
  useEffect(() => {
    const onResize = () => setN(count())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return n
}
