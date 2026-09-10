"use client";

import { useEffect, useState } from "react";
import { accentCSS } from "./board/palette";

/** the current accent as a CSS colour, re-rendering when it changes */
export function useAccent() {
  const [c, setC] = useState(accentCSS());
  useEffect(() => {
    const on = () => setC(accentCSS());
    on();
    window.addEventListener("accent", on);
    return () => window.removeEventListener("accent", on);
  }, []);
  return c;
}
