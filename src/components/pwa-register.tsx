"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Beatly PWA registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("Beatly PWA registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
