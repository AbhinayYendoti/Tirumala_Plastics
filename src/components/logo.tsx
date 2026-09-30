import Image from "next/image";

/**
 * The owner's TP emblem (public/logo-mark.png) on a white disc, so the black letters
 * stay readable on the maroon login hero as well as on the ivory app background.
 * `animated` pops the disc in on the sign-in screen (see globals.css).
 */
export function LogoMark({ className, animated }: { className?: string; animated?: boolean }) {
  return (
    <span
      className={`${animated ? "emblem-anim" : ""} inline-flex aspect-square items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(42,26,20,0.08)] ${className ?? ""}`}
      aria-hidden="true"
    >
      <Image src="/logo-mark.png" alt="" width={633} height={633} priority sizes="160px" className="w-[88%]" />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <LogoMark className="h-14 w-14 shrink-0" />
      <div className="leading-tight">
        <div className="font-serif text-xl text-ink">Tirumala</div>
        <div className="font-serif text-xl italic text-maroon">Plastics</div>
        <div className="mt-0.5 text-[10px] tracking-[0.2em] text-[#9a7b4f]">KOTHAVALASA</div>
      </div>
    </div>
  );
}
