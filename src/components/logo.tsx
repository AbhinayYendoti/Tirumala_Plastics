/**
 * The emblem: Srivari namam beneath the kireetam, inside a three-arc ring.
 * `animated` draws the ring, raises the crown tier by tier and reveals the namam (see globals.css).
 */
export function LogoMark({ className, animated }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className={`${animated ? "emblem-anim" : ""} ${className ?? ""}`} aria-hidden="true">
      <circle cx="100" cy="100" r="96" fill="#6B1A0E" />
      <g className="ring" fill="none" stroke="#D4A63A" strokeWidth="3" strokeLinecap="round">
        <path d="M115.28 13.34 A88 88 0 0 1 182.69 130.1" />
        <path d="M167.41 156.57 A88 88 0 0 1 32.59 156.57" />
        <path d="M17.31 130.1 A88 88 0 0 1 84.72 13.34" />
      </g>
      <g className="crown" fill="#D4A63A">
        <path d="M100 22 L105 34 L95 34 Z" />
        <path d="M94 37 H106 L109 47 H91 Z" />
        <path d="M89 50 H111 L115 62 H85 Z" />
        <path d="M83 65 H117 L122 78 H78 Z" />
        <rect x="72" y="81" width="56" height="9" rx="2.5" />
      </g>
      <g fill="#6B1A0E" className={animated ? "animate-fade-in [animation-delay:600ms]" : undefined}>
        <circle cx="100" cy="85.5" r="2.4" />
        <circle cx="88" cy="85.5" r="1.6" />
        <circle cx="112" cy="85.5" r="1.6" />
      </g>
      <path
        className="namam"
        d="M73 98 H87 Q87 134 100 144 Q113 134 113 98 H127 Q126 142 100 160 Q74 142 73 98 Z"
        fill="#FFF8EE"
      />
      <path className="tilak" d="M100 100 Q104 116 100 138 Q96 116 100 100 Z" fill="#F2913D" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <LogoMark className="h-14 w-14 shrink-0" />
      <div className="leading-tight">
        <div className="font-serif text-xl text-ink">Tirumala</div>
        <div className="font-serif text-xl italic text-maroon">Plastics</div>
        <div className="mt-0.5 text-[10px] tracking-[0.2em] text-[#9a7b4f]">KOTTAVALASA</div>
      </div>
    </div>
  );
}
