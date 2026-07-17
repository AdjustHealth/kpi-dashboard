"use client";

import { useState } from "react";
import { NewProviderForm } from "@/components/settings/NewProviderForm";
import { ProviderRow } from "@/components/settings/ProviderRow";
import { Provider } from "@/lib/types";

export function SettingsManager({ initialProviders }: { initialProviders: Provider[] }) {
  const [providers, setProviders] = useState<Provider[]>(initialProviders);

  return (
    <div className="flex flex-col gap-6">
      <NewProviderForm onCreated={(p) => setProviders((prev) => [...prev, p])} />
      <div className="flex flex-col gap-4">
        {providers.map((provider) => (
          <ProviderRow key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  );
}
