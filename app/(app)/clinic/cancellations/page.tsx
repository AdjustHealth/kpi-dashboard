import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { CancellationsTable, CancellationEventRow } from "@/components/clinic/CancellationsTable";
import { createClient } from "@/lib/supabase/server";
import { defaultWeekEnding, formatWeekLabel } from "@/lib/week";

export default async function CancellationsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();

  const supabase = await createClient();
  const { data } = await supabase
    .from("cancellation_events")
    .select("*")
    .eq("week_ending", week)
    .order("appointment_date", { ascending: true })
    .order("client", { ascending: true });

  const rows = (data ?? []) as CancellationEventRow[];
  const cancelled = rows.filter((r) => r.status === "Cancelled");
  const dnas = rows.filter((r) => r.status === "Did Not Arrive");

  return (
    <>
      <PageHeader title="Cancellations" subtitle="Every cancellation and DNA this week — scroll through with the admin team." />
      <div className="flex flex-col gap-6 p-8">
        {rows.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              No cancellations data for this week yet — upload the Cancellations report on Weekly Input.
            </p>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted">
              {cancelled.length} cancellations, {dnas.length} DNAs for the week ending {formatWeekLabel(week)}. This
              is every raw row from the Cancellations report — not deduped or filtered like the KPI stats elsewhere
              in the app, so a client with several cancelled services in one go shows up more than once here. Click
              a column heading to sort.
            </p>
            <Card>
              <CancellationsTable rows={rows} />
            </Card>
          </>
        )}
      </div>
    </>
  );
}
