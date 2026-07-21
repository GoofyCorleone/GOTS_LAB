// Email domain validation for UIS institutional accounts
export const UIS_EMAIL_DOMAIN = "correo.uis.edu.co";

export function isValidUISEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${UIS_EMAIL_DOMAIN}`);
}

export function getEmailDomain(email: string): string {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1] : "";
}

export const EMAIL_VALIDATION_MESSAGE = `Solo se permite registro con correo institucional @${UIS_EMAIL_DOMAIN}`;
