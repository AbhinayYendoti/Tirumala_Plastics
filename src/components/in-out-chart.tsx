import { formatDate, kgs } from "@/lib/format";

/** Paired daily bars: scrap received vs material dispatched. Plain SVG, no chart library. */
export function InOutChart({ data }: { data: { day: string; inKg: number; outKg: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.inKg, d.outKg]));
  const W = 700;
  const H = 160;
  const slot = W / data.length;
  const bar = Math.max(2, Math.min(12, slot / 2 - 3));

  return (
    <figure>
      <div className="mb-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-gold" /> Inward
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-maroon" /> Outward
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Daily inward and outward weight">
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--color-line)" />
        {data.map((d, i) => {
          const cx = i * slot + slot / 2;
          const hi = (d.inKg / max) * (H - 8);
          const ho = (d.outKg / max) * (H - 8);
          return (
            <g key={d.day}>
              <title>{`${formatDate(d.day)} — in ${kgs(d.inKg)}, out ${kgs(d.outKg)}`}</title>
              <rect x={0 + i * slot} y={0} width={slot} height={H} fill="transparent" />
              {hi > 0 && <rect x={cx - bar - 1} y={H - hi} width={bar} height={hi} rx="2" fill="var(--color-gold)" />}
              {ho > 0 && <rect x={cx + 1} y={H - ho} width={bar} height={ho} rx="2" fill="var(--color-maroon)" />}
              {(i === 0 || i === data.length - 1 || i % 7 === 0) && (
                <text x={cx} y={H + 14} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
                  {d.day.slice(8)}/{d.day.slice(5, 7)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
