import Skeleton from "@/components/ui/Skeleton";

export default function AnalyticsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
      <Skeleton className="h-52" />
      <Skeleton className="h-52" />
    </div>
  );
}
