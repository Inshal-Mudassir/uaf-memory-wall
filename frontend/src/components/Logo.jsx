export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#2F5D46" />
        <g transform="rotate(-7 20 21)">
          <rect x="8" y="7" width="24" height="27" rx="2" fill="#F7F2E6" />
          <rect x="11" y="10" width="18" height="15" rx="1" fill="#BFD3B3" />
          <path d="M11 25l5-6 4 4 3-3 6 5z" fill="#3F6F55" />
          <circle cx="20" cy="8" r="2.6" fill="#F4E4A1" stroke="#2F5D46" strokeWidth="1.4" />
        </g>
      </svg>
      <span className="font-display text-[19px] leading-none text-ink">UAF Memory Wall</span>
    </span>
  )
}
