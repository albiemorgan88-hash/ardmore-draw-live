export const ADMIN_EMAILS = ["contact@bluecanvas.ai"] as const;

export function isAdminEmail(email?: string | null) {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number]));
}
