import type { User } from "@supabase/supabase-js";
import { env } from "./env";

const adminEmails = new Set(
  (env.adminEmails ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function getUserDisplayName(user: User): string {
  const metadata = user.user_metadata;
  const name =
    metadata.full_name ?? metadata.name ?? metadata.preferred_username ?? user.email;
  return typeof name === "string" && name.trim() ? name.trim() : "사용자";
}

export function getUserEmail(user: User): string {
  return user.email ?? "이메일 없음";
}

export function getUserInitial(user: User): string {
  return getUserDisplayName(user).charAt(0).toUpperCase();
}

export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false;
  return adminEmails.has(user.email.toLowerCase());
}
