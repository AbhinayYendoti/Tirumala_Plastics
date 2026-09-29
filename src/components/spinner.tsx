const SIZES = { xs: "h-3.5 w-3.5 border-2", sm: "h-4 w-4 border-2", md: "h-6 w-6 border-[2.5px]", lg: "h-9 w-9 border-[3px]" };

/** Classic rotating ring: gold arc on a faint track. Inherits colour from `currentColor` for the track. */
export function Spinner({ size = "sm", className }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`spinner inline-block shrink-0 animate-spin rounded-full border-current/25 border-t-gold ${SIZES[size]} ${className ?? ""}`}
    />
  );
}
