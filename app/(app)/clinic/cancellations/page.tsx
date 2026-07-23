import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { defaultWeekEnding, formatWeekLabel } from "@/lib/week";

interface CancellationEventRow {
  id: string;
  appointment_date: string | null;
  client: string;
  provider: string | null;
  case_name: string | null;
  status: "Cancelled" | "Did Not Arrive";
  note: string | null;
  next_booking: string | null;
  modified_user: string | null;
}

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
              in the app, so a client with several cancelled services in one go shows up more than once here.
            </p>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3 font-medium whitespace-nowrap">Date</th>
                      <th className="py-2 px-3 font-medium whitespace-nowrap">Client</th>
                      <th className="py-2 px-3 font-medium whitespace-nowrap">Provider</th>
                      <th className="py-2 px-3 font-medium whitespace-nowrap">Status</th>
                      <th className="py-2 px-3 font-medium">Note</th>
                      <th className="py-2 px-3 font-medium whitespace-nowrap">Next Booking</th>
                      <th className="py-2 px-3 font-medium whitespace-nowrap">Handled By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/60 last:border-0 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap text-muted">
                          {row.appointment_date ? formatWeekLabel(row.appointment_date) : "—"}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-foreground">{row.client}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-muted">{row.provider ?? "—"}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={
                              row.status === "Did Not Arrive"
                                ? { color: "var(--color-danger)", backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)" }
                                : { color: "var(--color-muted)", backgroundColor: "var(--color-surface-raised)" }
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="max-w-md py-2 px-3 text-foreground">{row.note ?? "—"}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-muted">
                          {row.next_booking ? formatWeekLabel(row.next_booking) : "Not rebooked"}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-muted">{row.modified_user ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
