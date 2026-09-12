/**
 * Admin Configuration & Role Resolution Engine
 * Allows specified Google accounts to access the Admin Dashboard directly without separate login forms.
 */

// Authorized Admin Email Allowlist
export const ADMIN_EMAILS: readonly string[] = [
  "onlinework0876@gmail.com", // Primary Super Admin
];

const LOCAL_ADMIN_EMAILS_KEY = "cherry_custom_admin_emails";

/**
 * Returns all active admin emails (primary + dynamically added admins)
 */
export function getAllAdminEmails(): string[] {
  const list = [...ADMIN_EMAILS];
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_EMAILS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const email of parsed) {
          if (typeof email === "string" && !list.some(e => e.toLowerCase() === email.toLowerCase().trim())) {
            list.push(email.trim());
          }
        }
      }
    }
  } catch (_) {}
  return list;
}

/**
 * Checks if a given email is in the authorized admin allowlist
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const allAdmins = getAllAdminEmails();
  return allAdmins.some((adminEmail) => adminEmail.toLowerCase() === normalized);
}

/**
 * Adds an authorized admin email to persistent local store
 */
export function addAdminEmail(email: string): { success: boolean; message: string } {
  if (!email || !email.includes("@")) {
    return { success: false, message: "Please provide a valid email address." };
  }
  const normalized = email.trim().toLowerCase();
  const allAdmins = getAllAdminEmails();
  if (allAdmins.some(e => e.toLowerCase() === normalized)) {
    return { success: false, message: "This email is already an authorized admin." };
  }
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_EMAILS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    list.push(normalized);
    localStorage.setItem(LOCAL_ADMIN_EMAILS_KEY, JSON.stringify(list));
    return { success: true, message: `Admin ${normalized} added successfully.` };
  } catch (e) {
    return { success: false, message: "Failed to persist new admin." };
  }
}

/**
 * Removes a dynamically added admin email (primary admin cannot be deleted)
 */
export function removeAdminEmail(email: string): { success: boolean; message: string } {
  const normalized = email.trim().toLowerCase();
  if (ADMIN_EMAILS.some(e => e.toLowerCase() === normalized)) {
    return { success: false, message: "Primary Super Admin cannot be removed." };
  }
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_EMAILS_KEY);
    if (!raw) return { success: false, message: "Admin not found." };
    const list: string[] = JSON.parse(raw);
    const filtered = list.filter(e => e.toLowerCase() !== normalized);
    localStorage.setItem(LOCAL_ADMIN_EMAILS_KEY, JSON.stringify(filtered));
    return { success: true, message: `Admin ${normalized} removed.` };
  } catch (e) {
    return { success: false, message: "Failed to remove admin." };
  }
}

/**
 * Resolves the primary role for an authenticated user
 */
export function getUserRole(user: { email?: string | null } | null): "admin" | "student" {
  if (!user || !user.email) return "student";
  return isAdminEmail(user.email) ? "admin" : "student";
}
