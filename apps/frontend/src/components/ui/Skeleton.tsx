interface SkeletonProps {
  className?: string;
  variant?: 'block' | 'line' | 'circle';
}

const variantClass: Record<NonNullable<SkeletonProps['variant']>, string> = {
  block: 'rounded-xl',
  line: 'h-3 rounded-full',
  circle: 'rounded-full',
};

export function Skeleton({ className = '', variant = 'block' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-zinc-800/70 ${variantClass[variant]} ${className}`}
    />
  );
}
