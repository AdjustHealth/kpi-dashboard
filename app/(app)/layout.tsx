import { ReactNode } from "react";
import { Sidebar } from "@/components/nav/Sidebar";
import { SignOutButton } from "@/components/nav/SignOutButton";

export default function AppLayout({ children }: { children: ReactNode }) {
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
