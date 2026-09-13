import { PageHeader } from "@/components/nav/PageHeader";
import { PROGRAMMING_RULES, isChainSection } from "@/lib/programTracker/rules";

export default function RulesPage() {
  return (
    <>
      <PageHeader title="Programming Rules" showWeekSelector={false} />
      <div className="flex flex-col gap-4 p-8">
        {PROGRAMMING_RULES.map((sec, i) => (
          <div key={sec.section} className="overflow-hidden rounded-xl border border-border bg-surface-raised/40">
            <div className="flex items-center gap-3 border-b border-border bg-surface-raised px-4 py-3">
              <span className="font-display flex h-6 w-6 flex-none items-center justify-center rounded-md bg-accent/15 text-xs font-bold text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm font-semibold text-foreground">{sec.section}</span>
            </div>
            {isChainSection(sec) ? (
              <div className="p-4">
                <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">{sec.chainLabel}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {sec.chain.map((stage, i) => (
                    <span key={stage} className="flex items-center gap-2">
                      <span className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs">{stage}</span>
                      {i < sec.chain.length - 1 && <span className="text-muted">→</span>}
                    </span>
                  ))}
                </div>
                {sec.note && <div className="mt-3.5 border-t border-border pt-3.5 text-sm text-muted">{sec.note}</div>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      {sec.cols.map((c, i) => (
                        <th key={c} className="border-b border-border bg-surface-raised px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted" style={{ width: i === 0 ? "18%" : undefined }}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sec.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className={`px-3 py-2.5 align-top ${ci === 0 ? "font-semibold text-accent" : "text-muted"}`}>
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
