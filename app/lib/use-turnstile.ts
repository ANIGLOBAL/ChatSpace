import { useEffect, useRef, useState } from "react";

export function useTurnstile(siteKey: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !siteKey || typeof window === "undefined") return;

    let cancelled = false;
    let widgetId: string | undefined;

    loadTurnstile(() => {
      if (cancelled || !element || !window.turnstile) return;
      try {
        widgetId = window.turnstile.render(element, {
          sitekey: siteKey,
          theme: "light",
          callback: (value: unknown) => setToken(typeof value === "string" ? value : ""),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      } catch (renderError) {
        setError("Không tải được xác minh con người.");
        void renderError;
      }
    });

    return () => {
      cancelled = true;
      if (widgetId) {
        try {
          window.turnstile?.remove(widgetId);
        } catch {
          // unmounting
        }
      }
    };
  }, [siteKey]);

  return { ref, token, error };
}

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string | undefined;
      remove: (id: string) => void;
    };
    __turnstileQueue?: Array<() => void>;
  }
}

function loadTurnstile(onReady: () => void) {
  if (typeof window === "undefined") return;
  if (window.turnstile) {
    onReady();
    return;
  }
  const queue = (window.__turnstileQueue = window.__turnstileQueue ?? []);
  queue.push(onReady);
  if (document.getElementById("cf-turnstile-api")) return;

  const script = document.createElement("script");
  script.id = "cf-turnstile-api";
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    const pending = window.__turnstileQueue ?? [];
    window.__turnstileQueue = [];
    for (const run of pending) run();
  };
  script.onerror = () => {
    window.__turnstileQueue = [];
  };
  document.head.appendChild(script);
}

export const TURNSTILE_SITE_KEY = (window as unknown as { CHATSPACE_CONFIG?: { site?: string } })
  .CHATSPACE_CONFIG?.site ?? "0x4AAAAAAFu6hbY1Si8CPJvn";
