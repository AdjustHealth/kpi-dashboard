import Link from "next/link";
import { ROLE_LABELS } from "@/lib/providerSchema";
import { Provider } from "@/lib/types";

export function ProviderCard({ provider, href }: { provider: Provider; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
    >
      <span className="text-sm font-medium text-foreground">{provider.name}</span>
      <span className="text-xs text-muted">{ROLE_LABELS[provider.role]}</span>
    </Link>
  );
}
