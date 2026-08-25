"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Your own back rooms aren't visits.
const IGNORED = ["/admin", "/config"];

/**
 * Counts one visit per session, site-wide, and hands the route handler the
 * entry page + external referrer (both only knowable client-side). Load any
 * page with ?me=1 to mute this browser for good — otherwise your own traffic
 * drowns out the real signal.
 */
export function VisitPing() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).has("me")) {
        localStorage.setItem("ik_owner", "1");
      }
      if (localStorage.getItem("ik_owner")) return;
      if (IGNORED.some((p) => pathname.startsWith(p))) return;
      if (sessionStorage.getItem("ik_viewed")) return;
      sessionStorage.setItem("ik_viewed", "1");
      fetch("/api/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, referrer: document.referrer || null }),
      });
    } catch {}
  }, [pathname]);

  return null;
}
