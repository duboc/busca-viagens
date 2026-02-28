interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle';
  width?: string;
  height?: string;
  className?: string;
  lines?: number;
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  lines = 1,
}: SkeletonProps) {
  if (variant === 'circle') {
    return (
      <div
        className={`rounded-full bg-gray-200 animate-pulse ${className}`}
        style={{
          width: width ?? '2.5rem',
          height: height ?? '2.5rem',
        }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-200 p-4 animate-pulse ${className}`}
        style={{ width, height }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gray-200" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-2 w-14 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="h-5 w-24 bg-gray-200 rounded" />
            <div className="h-2 w-16 bg-gray-200 rounded ml-auto" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="space-y-1.5 text-center">
            <div className="h-5 w-12 bg-gray-200 rounded mx-auto" />
            <div className="h-2 w-8 bg-gray-200 rounded mx-auto" />
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="h-2 w-12 bg-gray-200 rounded" />
            <div className="w-full h-px bg-gray-200" />
            <div className="h-2 w-16 bg-gray-200 rounded" />
          </div>
          <div className="space-y-1.5 text-center">
            <div className="h-5 w-12 bg-gray-200 rounded mx-auto" />
            <div className="h-2 w-8 bg-gray-200 rounded mx-auto" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 bg-gray-200 rounded" />
            <div className="h-2 w-12 bg-gray-200 rounded" />
          </div>
          <div className="h-2 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // variant === 'text'
  return (
    <div className={`space-y-2 ${className}`} style={{ width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-200 animate-pulse rounded"
          style={{
            height: height ?? '0.75rem',
            width: i === lines - 1 && lines > 1 ? '75%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

export function FlightCardSkeleton() {
  return <Skeleton variant="card" />;
}

export function FlightCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <FlightCardSkeleton key={i} />
      ))}
    </div>
  );
}
