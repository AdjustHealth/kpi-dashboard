import { Card } from "@/components/ui/Card";

/** This clinician's own new patients for the week, by name — sourced from the Clients & Cases upload (provider_weekly.metrics.new_patient_names). */
export function NewPatientsCard({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <Card title={`New Patients This Week (${names.length})`}>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-foreground sm:grid-cols-2 lg:grid-cols-3">
        {names.map((name, i) => (
          <li key={`${name}-${i}`}>{name}</li>
        ))}
      </ul>
    </Card>
  );
}
