"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentProfile } from "@/lib/supabase/queries/experiments";

/**
 * Redirects external (non-UIS) accounts away from routes reserved for lab
 * members — inventory, experiments, accompany. Mirrors the header's own
 * access_scope check (defense in depth on top of the RLS exclusions, same
 * "three-layer" pattern already used for owner/participant permissions).
 * A no-op for anonymous visitors and UIS accounts.
 */
export function useExternalAccountGuard(redirectTo = "/prestamos") {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    getCurrentProfile()
      .then((profile: any) => {
        if (cancelled) return;
        if (profile.access_scope === "external") {
          router.replace(redirectTo);
        }
      })
      .catch((err) => console.error("Error checking access scope:", err));

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, redirectTo, router]);
}
