import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { api } from "~/lib/api";
import { TURNSTILE_SITE_KEY, useTurnstile } from "~/lib/use-turnstile";

const USERNAME_PATTERN = /^[a-z0-9_.]{3,24}$/;

export default function SignUp() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { ref, token } = useTurnstile(TURNSTILE_SITE_KEY);

  async function submit() {
    const uname = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(uname)) {
      setError("Tên người dùng: 3–24 ký tự a-z 0-9 _ . không đầu/cuối dấu chấm.");
      return;
    }
    if (!token) {
      setError("Vui lòng hoàn thành xác minh con người (Turnstile).");
      return;
    }
    setBusy(true);
    setError(null);
    const answer = await api("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        username: uname,
        name: name.trim() || uname,
        email: email.trim(),
        password,
        cfTurnstileToken: token,
      }),
    });
    if (!answer.ok) {
      setBusy(false);
      setError(answer.error);
      return;
    }
    window.dispatchEvent(new Event("chatspace:auth"));
    navigate("/");
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center px-4 py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tạo tài khoản ChatSpace</h1>
        <p className="mt-1 text-[13px] text-slate-500">Một tài khoản cho cả ChatIndex và ChatSpace.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void submit();
          }}
        >
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Tên người dùng (a-z, 0-9, _)"
            autoComplete="username"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tên hiển thị"
            autoComplete="name"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
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
            placeholder="Mật khẩu (tối thiểu 8 ký tự)"
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <div ref={ref} className="min-h-[64px] overflow-hidden rounded-lg" />
          {error ? <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-[14px] font-semibold text-white shadow transition hover:bg-indigo-500 disabled:opacity-50"
          >
            Tạo tài khoản
          </button>
        </form>
        <p className="mt-4 text-center text-[13px] text-slate-500">
          Đã có tài khoản?{" "}
          <Link to="/sign-in" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
