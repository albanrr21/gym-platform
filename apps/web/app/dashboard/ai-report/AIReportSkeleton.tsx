import Skeleton from "@/components/ui/Skeleton";

export default function AIReportSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-40" />
      <Skeleton className="h-48" />
      <Skeleton className="h-56" />
    </div>
  );
}
