import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";

import { api, type MiniUser } from "~/lib/api";

type OutletCtx = { user: MiniUser | null; refreshUser: () => void };

type OwnedSpace = { groupId: string; displayName: string; status: string };

export default function Control() {
  const { user, refreshUser } = useOutletContext<OutletCtx>();
  const navigate = useNavigate();
  const [owned, setOwned] = useState<OwnedSpace | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    api<{ spaces: (OwnedSpace & { role: string })[] }>("/api/spaces").then((result) => {
      if (!result.ok) return;
      const mineSpace = result.data.spaces.find((space) => space.role === "owner");
      setOwned(mineSpace ?? null);
    });
  }, []);

  if (!user) {
    return (
      <main className="mx-auto max-w-sm px-4 py-14">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Trang tài khoản</h1>
        <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">Đăng nhập để xem tài khoản của bạn.</p>
      </main>
    );
  }

  async function signOut() {
    await api("/api/auth/sign-out", { method: "POST" });
    refreshUser();
    navigate("/");
  }

  const row = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

  return (
    <main className="mx-auto max-w-xl px-4 py-12 space-y-8">
      <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Tài khoản</h1>
        <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
          {user.name} · <span className="font-mono">@{user.username}</span>
        </p>
        <p className="mt-1 text-[13px] text-slate-500">{user.email}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={signOut} className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Đăng xuất
          </button>
        </div>
      </section>

      {owned ? (
        <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-700" data-testid="owner-control">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Không gian của bạn</h2>
          <p className="mt-1 text-[13px] text-slate-500">
            {owned.displayName} · <span className="font-mono">{owned.groupId}</span> · trạng thái {owned.status}
          </p>
          <div className="mt-3 space-y-2" data-testid="transfer-row">
            <input className={row} placeholder="userId người nhận chuyển quyền (thành viên)" value={transferTo} onChange={(event) => setTransferTo(event.target.value)} />
            <button
              type="button"
              onClick={async () => {
                const answer = await api(`/api/spaces/${owned.groupId}/transfer`, {
                  method: "POST",
                  body: JSON.stringify({ userId: transferTo.trim() }),
                });
                setMsg(answer.ok ? { text: "Đã chuyển quyền." } : { text: answer.error, bad: true });
                setTransferTo("");
              }}
              className="rounded-lg bg-amber-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-amber-500"
            >
              Chuyển quyền Owner
            </button>
          </div>
          <div className="mt-4" data-testid="delete-row">
            <input className={row} type="password" placeholder="Mật khẩu xác nhận xoá nhóm" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button
              type="button"
              onClick={async () => {
                if (!password) {
                  setMsg({ text: "Nhập mật khẩu để xoá nhóm.", bad: true });
                  return;
                }
                const answer = await api(`/api/spaces/${owned.groupId}`, { method: "DELETE" });
                setMsg(answer.ok ? { text: "Đã xoá không gian. Group ID không dùng lại được." } : { text: answer.error, bad: true });
                setPassword("");
                setOwned(null);
              }}
              className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-red-500"
            >
              Xoá không gian (không hoàn tác)
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Không gian của bạn</h2>
          <p className="mt-2 text-[13px] text-slate-500">Bạn chưa sở hữu Group Space nào.</p>
        </section>
      )}

      {msg ? (
        <p className={msg.bad ? "text-[13px] text-red-600 dark:text-red-400" : "text-[13px] text-emerald-600 dark:text-emerald-400"}>
          {msg.text}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Quyền riêng tư</h2>
        <p className="mt-2 text-[13px] leading-6 text-slate-600 dark:text-slate-300">
          Tin nhắn nhóm được mã hoá bằng khoá hội thoại; nội dung ngoài không gian không truy cập được.
          Phiên đăng nhập gắn cookie HttpOnly + Secure. Khi gặp sự cố hãy liên hệ chủ nhóm hoặc quản trị ChatIndex.
        </p>
      </section>
    </main>
  );
}
