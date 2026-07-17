import { STATUS } from "@/components/charts/palette";

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "warning" | "critical";
  children: React.ReactNode;
}) {
  const color =
    tone === "neutral" ? "#9a9aa3" : STATUS[tone === "critical" ? "critical" : tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}1a` }}
    >
      {children}
    </span>
  );
}
