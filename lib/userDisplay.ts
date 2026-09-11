/** "michael@adjust.com.au" -> "Michael" — no display name stored anywhere yet, so this is the friendliest thing available. */
export function firstNameFromEmail(email: string | null | undefined) {
  if (!email) return null;
  const local = email.split("@")[0];
  const first = local.split(/[._-]/)[0];
  return first ? first[0].toUpperCase() + first.slice(1) : null;
}
