import type { ReactNode } from "react";

type Props = {
  title: string;
  body?: string;
  action?: ReactNode;
};

export default function EmptyState({ title, body, action }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
      <p className="text-base font-semibold text-gray-900">{title}</p>
      {body && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
