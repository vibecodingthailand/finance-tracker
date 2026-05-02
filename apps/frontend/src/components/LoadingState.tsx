import { Skeleton } from './ui/Skeleton';

type LoadingVariant = 'list' | 'table' | 'grid' | 'cards' | 'chart';

interface LoadingStateProps {
  variant?: LoadingVariant;
  rows?: number;
  className?: string;
}

export function LoadingState({ variant = 'list', rows = 5, className = '' }: LoadingStateProps) {
  if (variant === 'chart') {
    return <Skeleton className={`h-72 w-full ${className}`} />;
  }

  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-1 gap-4 md:grid-cols-3 ${className}`}>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {Array.from({ length: rows }).map((_, idx) => (
          <Skeleton key={idx} className="h-16" />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 ${className}`}>
        <Skeleton className="h-10 rounded-none" />
        <div className="divide-y divide-zinc-800">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="px-4 py-4">
              <Skeleton className="h-4 w-full" variant="line" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} className="h-16" />
      ))}
    </div>
  );
}
