import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";

import { api, type MiniUser, type SpaceRow } from "~/lib/api";

type OutletCtx = { user: MiniUser | null; refreshUser: () => void };

export default function Home() {
  const { user } = useOutletContext<OutletCtx>();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<SpaceRow[] | null>(null);
  const [owned, setOwned] = useState<number>(0);
  const [joinId, setJoinId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createApproval, setCreateApproval] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setSpaces(null);
      return;
    }
    api<{ spaces: SpaceRow[]; ownsGroupSpace: number }>("/api/spaces").then((result) => {
      if (result.ok) {
        setSpaces(result.data.spaces);
        setOwned(result.data.ownsGroupSpace);
      } else if (result.status === 401) {
        setSpaces([]);
      }
    });
  }, [user]);

  if (!user) {
    return (
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-indigo-100/70 to-transparent dark:from-indigo-950/30" />
        <section className="relative mx-auto max-w-3xl px-4 py-16 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
            Lớp Group Space trên hạ tầng ChatIndex
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Không gian nhóm<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
              của riêng bạn
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-slate-600 dark:text-slate-300">
            Mỗi tài khoản tạo một Group Space riêng: mời đúng người, đúng vai trò (Owner / Admin / Member),
            tin nhắn và tệp không lan ra ngoài — kiểm soát hoàn toàn bởi chủ nhóm.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/sign-in" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow transition hover:bg-indigo-500">
              Đăng nhập
            </Link>
            <Link to="/sign-up" className="rounded-xl border border-slate-300 px-5 py-2.5 text-[14px] font-semibold text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
              Tạo tài khoản
            </Link>
          </div>
          <ul className="mx-auto mt-12 grid max-w-2xl gap-3 text-left text-[13px] text-slate-700 sm:grid-cols-3 dark:text-slate-200">
            <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <b className="block text-slate-900 dark:text-white">Nhập Group ID</b>
              Chủ nhóm chia sẻ cs-…, bạn yêu cầu tham gia; bật duyệt thì Owner duyệt từng lượt.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <b className="block text-slate-900 dark:text-white">Quyền rõ ràng</b>
              Owner quản settings & thành viên; Admin hỗ trợ sàng lọc; Member chat + xem hồ sơ.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <b className="block text-slate-900 dark:text-white">Riêng tư tuyệt đối</b>
              Người ngoài nhóm không đọc nội dung dù biết Group ID; phiên cookie HttpOnly + Secure.
            </li>
          </ul>
        </section>
      </main>
    );
  }

  function refresh() {
    api<{ spaces: SpaceRow[]; ownsGroupSpace: number }>("/api/spaces").then((result) => {
      if (result.ok) {
        setSpaces(result.data.spaces);
        setOwned(result.data.ownsGroupSpace);
      }
    });
  }

  async function createSpace() {
    setBusy(true);
    const answer = await api<{ groupSpace: SpaceRow }>("/api/spaces", {
      method: "POST",
      body: JSON.stringify({ displayName: createName, requireOwnerApproval: createApproval }),
    });
    setBusy(false);
    if (!answer.ok) {
      setMsg({ text: answer.error, bad: true });
      return;
    }
    setCreateName("");
    setMsg({ text: "Đã tạo không gian." });
    refresh();
    navigate(`groups/${answer.data.groupSpace.groupId}`);
  }

  async function joinSpace() {
    if (!joinId.trim()) return;
    setBusy(true);
    const answer = await api(`/api/spaces/${joinId.trim()}/join`, { method: "POST" });
    setBusy(false);
    if (!answer.ok) {
      setMsg({ text: answer.error, bad: true });
      return;
    }
    setJoinId("");
    refresh();
    navigate(`groups/${joinId.trim()}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Xin chào @{user.username}</h1>
      {msg ? (
        <p className={msg.bad ? "mt-3 text-[14px] text-red-600 dark:text-red-400" : "mt-3 text-[14px] text-emerald-600 dark:text-emerald-400"}>
          {msg.text}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">Không gian của bạn</h2>
        {spaces === null ? (
          <p className="mt-2 text-[14px] text-slate-500">Đang tải…</p>
        ) : spaces.length === 0 ? (
          <p className="mt-2 text-[14px] text-slate-500">Chưa tham gia không gian nào.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {spaces.map((space) => (
              <li key={space.groupId} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/groups/${space.groupId}`} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                    {space.displayName}
                  </Link>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {space.role === "owner" ? "Owner" : space.role === "admin" ? "Admin" : "Member"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{space.description || "Không có mô tả"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700" data-testid="panel-create">
          <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Tạo Group Space</h3>
          <p className="mt-1 text-[12px] text-slate-500">
            {owned >= 1 ? "Bạn đã sở hữu 1 không gian." : "Mỗi tài khoản sở hữu tối đa 1 không gian."}
          </p>
          <input
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Tên không gian (1–80 ký tự)"
            maxLength={80}
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <label className="mt-3 flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={createApproval} onChange={(event) => setCreateApproval(event.target.checked)} />
            Bật duyệt thành viên (Owner duyệt từng yêu cầu)
          </label>
          <button
            type="button"
            disabled={busy || createName.trim().length === 0}
            onClick={createSpace}
            className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            Tạo không gian
          </button>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700" data-testid="panel-join">
          <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Tham gia bằng Group ID</h3>
          <p className="mt-1 text-[12px] text-slate-500">Dán Group ID dạng cs-… mà chủ nhóm chia sẻ.</p>
          <input
            value={joinId}
            onChange={(event) => setJoinId(event.target.value)}
            placeholder="cs-xxxxxxxx"
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={busy}
            onClick={joinSpace}
            className="mt-3 rounded-lg border border-indigo-600 px-3 py-2 text-[13px] font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Yêu cầu tham gia
          </button>
        </div>
      </section>
    </main>
  );
}
