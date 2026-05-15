import type { ReactNode } from "react";
import { AuthGate } from "./AuthGate";

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  return <AuthGate requireAdmin={requireAdmin}>{children}</AuthGate>;
}
