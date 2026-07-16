export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1e2640] rounded-lg ${className}`} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <SkeletonText lines={2} />
    </div>
  );
}
