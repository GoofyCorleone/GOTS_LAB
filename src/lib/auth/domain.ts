// Email domain validation for UIS institutional accounts.
// Students use @correo.uis.edu.co; staff/faculty use @uis.edu.co.
// This is UX-only — public.enforce_uis_email_domain() on auth.users is the
// authoritative check and rejects anything else even via direct API calls.
export const UIS_EMAIL_DOMAINS = ["correo.uis.edu.co", "uis.edu.co"] as const;

/** Kept for backwards compatibility with existing imports. */
export const UIS_EMAIL_DOMAIN = UIS_EMAIL_DOMAINS[0];

export function isValidUISEmail(email: string): boolean {
  // Mirrors the DB regex ^[^@]+@(correo\.)?uis\.edu\.co$ — anchored on both
  // ends so neither "x@uis.edu.co.evil.com" nor "x@notuis.edu.co" passes.
  return /^[^@\s]+@(correo\.)?uis\.edu\.co$/i.test(email.trim());
}

export function getEmailDomain(email: string): string {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1] : "";
}

export const EMAIL_VALIDATION_MESSAGE =
  "Solo se permite registro con correo institucional @correo.uis.edu.co o @uis.edu.co";
