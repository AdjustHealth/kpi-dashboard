import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth/access";

/** The "front door" — a director lands on the clinic-wide KPI dashboard, a
 * restricted login lands straight on the one section it has (Providers),
 * rather than bouncing through /dashboard first. requireDirector() on the
 * dashboard page itself is still the real access boundary; this is just
 * about landing everyone somewhere useful in one hop. */
export default async function Home() {
  const { isDirector } = await getAccessContext();
  redirect(isDirector ? "/dashboard" : "/providers");
}
