"use client";

import { useEffect } from "react";
import { useEntitlementStore } from "../store/entitlement-store";

/** On boot, read the user's entitlement + storage usage from the server. */
export function useEntitlement() {
  const refresh = useEntitlementStore((s) => s.refresh);
  useEffect(() => {
    refresh();
  }, [refresh]);
}
