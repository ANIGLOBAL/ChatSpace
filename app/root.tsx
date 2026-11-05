import { Outlet, Scripts, ScrollRestoration } from "react-router";
import type { LinksFunction, MetaFunction } from "react-router";
import { useEffect, useState } from "react";

import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import appStylesHref from "./app.css?url";
import { getSessionUser, type MiniUser } from "./lib/api";
import { THEME_BOOTSTRAP } from "./lib/theme";
import { ThemeProvider } from "./lib/theme-context";

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: `${import.meta.env.BASE_URL}favicon.svg` },
  { rel: "stylesheet", href: appStylesHref },
];

export const meta: MetaFunction = () => [
  { title: "ChatSpace" },
  {
    name: "description",
    content: "ChatSpace — không gian nhóm của riêng bạn, chia sẻ tin nhắn và tệp, đúng quyền và riêng tư.",
  },
];

export default function App() {
  const [user, setUser] = useState<MiniUser | null>(null);
  useEffect(() => {
    let alive = true;
    getSessionUser().then((found) => {
      if (alive) setUser(found);
    });
    const sync = () => {
      getSessionUser().then((found) => {
        if (alive) setUser(found);
      });
    };
    window.addEventListener("chatspace:auth", sync);
    return () => {
      alive = false;
      window.removeEventListener("chatspace:auth", sync);
    };
  }, []);
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <Header user={user} />
        <div className="flex-1">
          <Outlet context={{ user, refreshUser: syncUser }} />
        </div>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

let refreshScheduled = false;
async function syncUser() {
  if (refreshScheduled) return;
  refreshScheduled = true;
  setTimeout(() => {
    refreshScheduled = false;
    window.dispatchEvent(new Event("chatspace:auth"));
  }, 0);
}

export function HydrateFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <p className="text-[13px] text-slate-400">Đang tải ChatSpace…</p>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <script src="/api-config.js" />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
