import type { User } from "@supabase/supabase-js";

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
