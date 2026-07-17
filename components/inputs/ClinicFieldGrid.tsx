"use client";

import { ClinicField } from "@/lib/schema";
import { NumberField } from "@/components/inputs/NumberField";

export function ClinicFieldGrid({
  fields,
  values,
  onChange,
}: {
  fields: ClinicField[];
  values: Record<string, unknown>;
  onChange: (id: string, value: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => (
        <NumberField
          key={field.id}
          label={field.label}
          type={field.type === "date" ? "number" : field.type}
          decimals={field.decimals}
          value={values[field.id] as number | null | undefined}
          onChange={(v) => onChange(field.id, v)}
          source={field.source === "calc" ? "calc" : "manual"}
        />
      ))}
    </div>
  );
}
