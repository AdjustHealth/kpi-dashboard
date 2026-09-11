import { redirect } from "next/navigation";

/** The front door — everyone lands on the hub, which adapts itself to
 * director vs. restricted access (see app/(app)/home/page.tsx). */
export default function Home() {
  redirect("/home");
}
