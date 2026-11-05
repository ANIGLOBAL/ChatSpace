import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { api, type MiniUser } from "~/lib/api";
import { TURNSTILE_SITE_KEY, useTurnstile } from "~/lib/use-turnstile";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { ref, token } = useTurnstile(TURNSTILE_SITE_KEY);
  const [me, setMe] = useState<MiniUser | null>(null);
  void me;
  void setMe;

  async function submit() {
    if (!token) {
      setError("Vui lòng hoàn thành xác minh con người (Turnstile).");
      return;
    }
    setBusy(true);
    setError(null);
    const answer = await api("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password, cfTurnstileToken: token }),
    });
    if (!answer.ok) {
      setBusy(false);
      setError(answer.status === 401 ? "Sai email hoặc mật khẩu." : answer.error);
      return;
    }
    window.dispatchEvent(new Event("chatspace:auth"));
    navigate("/");
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center px-4 py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Chào mừng trở lại</h1>
        <p className="mt-1 text-[13px] text-slate-500">Đăng nhập để vào không gian nhóm của bạn.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void submit();
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mật khẩu"
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <div ref={ref} className="min-h-[64px] overflow-hidden rounded-lg" />
          {error ? <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-[14px] font-semibold text-white shadow transition hover:bg-indigo-500 disabled:opacity-50"
          >
            Đăng nhập
          </button>
        </form>
        <p className="mt-4 text-center text-[13px] text-slate-500">
          Chưa có tài khoản?{" "}
          <Link to="/sign-up" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Tạo tài khoản
          </Link>
        </p>
      </div>
    </main>
  );
}
