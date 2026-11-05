/**
 * API base + fetch helper for the ChatSpace SPA.
 * `window.CHATSPACE_CONFIG.api` (public/api-config.js) points at the shared
 * ChatIndex worker; same-origin fallback for local dev proxies.
 */
export function apiBase() {
  const config = (window as unknown as { CHATSPACE_CONFIG?: { api?: string } })
    .CHATSPACE_CONFIG;
  if (config?.api && typeof config.api === "string") {
    return config.api.replace(/\/+$/, "");
  }
  return "";
}

export function apiWsUrl(conversationId: string) {
  const base = apiBase().replace(/^https/, "wss");
  return `${base}/api/ws/${conversationId}?c=${encodeURIComponent(conversationId)}`;
}

export type ApiError = { error: string; status: number };

export async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // non-json (rare)
  }
  const message =
    payload && typeof payload === "object" && "error" in (payload as Record<string, unknown>)
      ? String((payload as Record<string, unknown>).error)
      : response.status === 401
        ? "Đăng nhập để tiếp tục."
        : `Lỗi HTTP ${response.status}`;
  if (!response.ok) return { ok: false, error: message, status: response.status };
  return { ok: true, data: (payload ?? {}) as T };
}

export type MiniUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  role: "user" | "admin";
  status: string;
  image: string | null;
  bannerFileId?: string | null;
  plan?: string;
};

export type SpaceRow = {
  groupId: string;
  displayName: string;
  description: string | null;
  status: string;
  requireOwnerApproval: boolean;
  role: "owner" | "admin" | "member";
  lastReadAt: string | null;
  joinedAt: string;
};

export async function getSessionUser(): Promise<MiniUser | null> {
  const result = await api<{ user?: MiniUser | null }>("/api/auth/get-session");
  if (!result.ok) return null;
  // get-session might not carry plan/banner — follow with /api/me if needed.
  try {
    const me = await api<{ user?: MiniUser | null }>("/api/me");
    const base = result.data.user ?? null;
    if (me.ok && me.data.user) {
      return { ...base!, ...me.data.user };
    }
    return base;
  } catch {
    return result.data.user ?? null;
  }
}

/** Upload one image file through /api/files and return its id. */
export async function uploadImageFile(file: File): Promise<string | null> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${apiBase()}/api/files`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // ignore
  }
  if (!response.ok) return null;
  const data = payload as { file?: { id?: string } };
  return data?.file?.id ?? null;
}
