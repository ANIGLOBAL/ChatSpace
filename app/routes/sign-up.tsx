import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { api } from "~/lib/api";

const USERNAME_PATTERN = /^[a-z0-9_.]{3,24}$/;

export default function SignUp() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const uname = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(uname)) {
      setError("Tên người dùng: 3–24 ký tự a-z 0-9 _ . không đầu/cuối dấu chấm.");
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
    <main className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tạo tài khoản ChatSpace</h1>
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
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tên hiển thị"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
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
          placeholder="Mật khẩu (tối thiểu 8 ký tự)"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        {error ? <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-[14px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Tạo tài khoản
        </button>
      </form>
      <p className="mt-4 text-[13px] text-slate-500">
        Đã có tài khoản?{" "}
        <Link to="/sign-in" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          Đăng nhập
        </Link>
      </p>
    </main>
  );
}
