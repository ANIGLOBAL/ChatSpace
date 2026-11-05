import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { api } from "~/lib/api";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const answer = await api("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
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
    <main className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Đăng nhập ChatSpace</h1>
      <p className="mt-1 text-[13px] text-slate-500">Dùng tài khoản ChatIndex của bạn.</p>
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
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mật khẩu"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        {error ? <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-[14px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Đăng nhập
        </button>
      </form>
      <p className="mt-4 text-[13px] text-slate-500">
        Chưa có tài khoản?{" "}
        <Link to="/sign-up" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          Tạo tài khoản
        </Link>
      </p>
    </main>
  );
}
