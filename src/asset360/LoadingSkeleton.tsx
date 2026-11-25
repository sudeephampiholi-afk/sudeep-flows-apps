import { Skeleton } from '@cognite/aura/components/skeleton';

type LoadingSkeletonProps = {
  label: string;
  rows?: number;
};

/** Aura skeleton placeholder shaped like a short list, announced as a status. */
export function LoadingSkeleton({ label, rows = 3 }: LoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex min-w-0 flex-col gap-3 py-2"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_value: unknown, index: number) => (
        <Skeleton
          key={index}
          data-skeleton-row=""
          className="h-12 w-full rounded-md"
        />
      ))}
    </div>
  );
}
