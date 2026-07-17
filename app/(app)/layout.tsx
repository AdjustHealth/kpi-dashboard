import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/nav/Sidebar";
import { SignOutButton } from "@/components/nav/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-end border-b border-border bg-background px-8 py-2">
          <SignOutButton />
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
