import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReportCard from "./report-card";

type StatusFilter = "open" | "reviewed" | "dismissed";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
  { value: "dismissed", label: "Dismissed" },
];

export default async function ModPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus: StatusFilter =
    status === "reviewed" || status === "dismissed" ? status : "open";

  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, entity_type, entity_id, reason, details, status, created_at, reporter_user_id")
    .eq("status", activeStatus)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-lg">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Moderation
        </h1>
      </header>

      {/* Status tabs */}
      <div className="flex gap-1 px-4 pb-3">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/mod?status=${tab.value}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Reports list */}
      <div className="flex flex-col gap-3 p-4">
        {!reports || reports.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {activeStatus === "open"
              ? "No open reports. All clear!"
              : activeStatus === "reviewed"
                ? "No reviewed reports yet."
                : "No dismissed reports."}
          </p>
        ) : (
          reports.map((report) => (
            <ReportCard
              key={report.id}
              id={report.id}
              entityType={report.entity_type}
              entityId={report.entity_id}
              reason={report.reason}
              details={report.details}
              status={report.status}
              createdAt={report.created_at}
            />
          ))
        )}
      </div>
    </div>
  );
}
