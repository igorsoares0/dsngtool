"use client";

import { useEffect } from "react";

// Registers the service worker once on the client. Kept as a tiny client
// component so the root layout can stay a server component.
export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration can fail on unsupported/insecure contexts — ignore.
    });
  }, []);

  return null;
}
