const RATIOS = [1.25, 0.8, 1, 0.72, 1.15, 0.9]

export function CardSkeleton({ i = 0 }) {
  return (
    <div className="rounded-[3px] bg-white p-3 shadow-frame" aria-hidden="true">
      <div className="skeleton w-full rounded-[2px]" style={{ aspectRatio: `1 / ${RATIOS[i % RATIOS.length]}` }} />
      <div className="skeleton mt-4 h-5 w-4/5 rounded" />
      <div className="skeleton mt-2 h-4 w-3/5 rounded" />
      <div className="mt-5 flex justify-between"><div className="skeleton h-6 w-24 rounded-full" /><div className="skeleton h-6 w-16 rounded-full" /></div>
    </div>
  )
}

export function GallerySkeleton({ columns }) {
  const cols = Array.from({ length: columns }, (_, c) => Array.from({ length: columns === 1 ? 2 : 2 }, (_, r) => c * 2 + r))
  return (
    <div className="flex gap-7" role="status" aria-label="Loading memories">
      {cols.map((col, c) => (
        <div key={c} className="flex flex-1 flex-col gap-9">{col.map((i) => <CardSkeleton key={i} i={i} />)}</div>
      ))}
    </div>
  )
}
