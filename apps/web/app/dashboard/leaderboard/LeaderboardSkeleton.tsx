import Skeleton from "@/components/ui/Skeleton";

export default function LeaderboardSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Skeleton className="h-12" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  );
}
