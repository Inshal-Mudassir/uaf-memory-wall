export default function EmptyState({ title, text, children }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-14 text-center">
      <svg viewBox="0 0 220 170" className="h-44 w-56" aria-hidden="true">
        <g transform="rotate(-6 80 90)">
          <rect x="30" y="28" width="104" height="118" rx="4" fill="#fff" stroke="#E2D6BB" />
          <rect x="40" y="38" width="84" height="72" rx="2" fill="#EFE7D3" />
          <path d="M40 110l26-30 20 20 14-14 24 24z" fill="#DCE7D4" />
          <circle cx="100" cy="58" r="8" fill="#F4E4A1" />
          <circle cx="82" cy="30" r="7" fill="#7FA07A" stroke="#2F5D46" strokeWidth="2" />
        </g>
        <g transform="rotate(7 160 70)">
          <rect x="128" y="34" width="62" height="62" fill="#F4E4A1" />
          <path d="M138 56h42M138 68h34M138 80h26" stroke="#B9A24A" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
      <h3 className="mt-2 font-display text-2xl text-ink">{title}</h3>
      <p className="mt-2 text-ink-soft">{text}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}
