import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminSupabase, supabase } from "@/lib/supabase";

export type UserRole = "customer" | "merchant" | "admin";
type UserRoleScope = "consumer" | "admin";

interface UseUserRoleOptions {
  scope?: UserRoleScope;
}

const USER_ROLES: UserRole[] = ["customer", "merchant", "admin"];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function useUserRole(options: UseUserRoleOptions = {}) {
  const { scope = "consumer" } = options;
  const consumerAuth = useAuth();
  const adminAuth = useAdminAuth();
  const selectedAuth = scope === "admin" ? adminAuth : consumerAuth;
  const authClient = scope === "admin" ? adminSupabase : supabase;
  const { user, loading: isAuthLoading } = selectedAuth;
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const currentUserId = user?.id ?? null;

    const resolveRole = async () => {
      if (isAuthLoading) {
        return;
      }

      if (!currentUserId) {
        if (isMounted) {
          setRole(null);
          setLoading(false);
          setResolvedUserId(null);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setResolvedUserId(null);
      }

      const { data, error } = await authClient
        .from("profiles")
        .select("role")
        .eq("id", currentUserId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.warn("[useUserRole] failed to resolve role:", error.message);
        setRole(null);
        setLoading(false);
        setResolvedUserId(currentUserId);
        return;
      }

      setRole(isUserRole(data?.role) ? data.role : null);
      setLoading(false);
      setResolvedUserId(currentUserId);
    };

    void resolveRole();

    return () => {
      isMounted = false;
    };
  }, [authClient, isAuthLoading, user?.id]);

  const isAdminLike = useMemo(
    () => role === "admin" || role === "merchant",
    [role]
  );

  return {
    role,
    isAdminLike,
    loading:
      isAuthLoading ||
      loading ||
      (!!user?.id && resolvedUserId !== user.id),
  };
}
