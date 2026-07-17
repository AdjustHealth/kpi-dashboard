"use client";

import { Field, Input } from "@/components/ui/Field";

type NumericType = "currency" | "number" | "decimal" | "percent";

/** A labeled numeric input. For "percent" fields the DB stores a 0-1 fraction; the user types the whole percentage (e.g. 88 for 88%). */
export function NumberField({
  label,
  type,
  value,
  onChange,
  decimals,
}: {
  label: string;
  type: NumericType;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  decimals?: number;
}) {
  const displayValue =
    value === null || value === undefined
      ? ""
      : type === "percent"
        ? round(value * 100, 2)
        : value;

  return (
    <Field label={label}>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={type === "currency" || type === "number" ? 1 : type === "decimal" && decimals ? 10 ** -decimals : "any"}
          value={displayValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
              return;
            }
            const num = Number(raw);
            if (Number.isNaN(num)) return;
            onChange(type === "percent" ? num / 100 : num);
          }}
          className={type === "currency" ? "pl-6" : type === "percent" ? "pr-7" : ""}
        />
        {type === "currency" && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">
            $
          </span>
        )}
        {type === "percent" && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">
            %
          </span>
        )}
      </div>
    </Field>
  );
}

function round(n: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
