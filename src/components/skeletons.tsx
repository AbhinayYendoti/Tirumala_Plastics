import { Card, cx } from "./ui";

export function Bone({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function HeaderSkeleton() {
  return (
    <div className="mb-5 space-y-2">
      <Bone className="h-8 w-48" />
      <Bone className="h-4 w-64" />
    </div>
  );
}

export function StatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={cx("mb-4 grid gap-3", count === 4 ? "grid-cols-2 sm:grid-cols-4" : count === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="space-y-2 p-3.5">
          <Bone className="h-3 w-16" />
          <Bone className="h-6 w-24" />
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="divide-y divide-line p-0">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5" style={{ opacity: 1 - i * 0.12 }}>
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-56 max-w-full" />
          </div>
          <Bone className="h-5 w-20" />
        </div>
      ))}
    </Card>
  );
}

export function FiltersSkeleton() {
  return (
    <div className="mb-4 flex gap-2">
      {["w-16", "w-16", "w-24", "w-24"].map((w, i) => (
        <Bone key={i} className={cx("h-8 !rounded-full", w)} />
      ))}
    </div>
  );
}

export function ListPageSkeleton({ stats = 3 }: { stats?: number }) {
  return (
    <div className="animate-fade-in">
      <HeaderSkeleton />
      <FiltersSkeleton />
      {stats > 0 && <StatsSkeleton count={stats} />}
      <ListSkeleton />
    </div>
  );
}

export function FormThenListSkeleton() {
  return (
    <div className="animate-fade-in">
      <HeaderSkeleton />
      <Card className="mb-6 space-y-3">
        <Bone className="h-16 w-full" />
        <Bone className="h-12 w-2/3" />
      </Card>
      <StatsSkeleton />
      <ListSkeleton rows={4} />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-fade-in">
      <HeaderSkeleton />
      <Card className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-3.5 w-24" />
            <Bone className="h-12 w-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}
