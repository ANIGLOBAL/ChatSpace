import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";

import { api, type MiniUser } from "~/lib/api";

type OutletCtx = { user: MiniUser | null; refreshUser: () => void };

type SpaceAdminRow = {
  groupId: string;
  displayName: string;
  status: string;
  createdAt: string;
  ownerUserId: string;
  ownerUsername: string;
  memberCount: number;
};

type AdminUserRow = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  plan?: string;
};

const STATUSES = [
  { key: "", label: "Tất cả" },
  { key: "active", label: "Đang hoạt động" },
  { key: "suspended", label: "Tạm ngừng" },
  { key: "deleted", label: "Đã xoá" },
];

function adminPost(body: Record<string, unknown>) {
  return api("/api/admin", { method: "POST", body: JSON.stringify(body) });
}

export default function Admin() {
  const { user } = useOutletContext<OutletCtx>();
  const [tab, setTab] = useState<"overview" | "spaces" | "users" | "switches">("overview");
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [spaceQuery, setSpaceQuery] = useState("");
  const [spaceStatus, setSpaceStatus] = useState("");
  const [spaceRows, setSpaceRows] = useState<SpaceAdminRow[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userRows, setUserRows] = useState<AdminUserRow[]>([]);
  const [auditRows, setAuditRows] = useState<{ action: string; target: string; detail: string | null; at: string; byUsername: string }[]>([]);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const loadStats = useCallback(async () => {
    const answer = await api<Record<string, unknown>>("/api/admin?stats=1");
    if (answer.ok) setStats(answer.data);
  }, []);

  const loadSpaces = useCallback(async () => {
    const params = new URLSearchParams({ spaces: "1" });
    if (spaceQuery.trim()) params.set("q", spaceQuery.trim());
    if (spaceStatus) params.set("status", spaceStatus);
    const answer = await api<{ groupSpaces: SpaceAdminRow[] }>(`/api/admin?${params.toString()}`);
    if (answer.ok) setSpaceRows(answer.data.groupSpaces);
  }, [spaceQuery, spaceStatus]);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (userQuery.trim()) params.set("q", userQuery.trim());
    const answer = await api<{ users: AdminUserRow[] }>(`/api/admin?${params.toString()}`);
    if (answer.ok) setUserRows(answer.data.users);
  }, [userQuery]);

  const loadAudit = useCallback(async () => {
    const answer = await api<{ audit: { id: number; action: string; target?: string; detail?: string; createdAt: string; byUsername?: string }[] }>(
      "/api/admin?audit=1&limit=15",
    );
    if (answer.ok) {
      setAuditRows(
        answer.data.audit.map((row) => ({
          action: row.action,
          target: row.target ?? "",
          detail: row.detail ?? null,
          at: row.createdAt,
          byUsername: row.byUsername ?? "",
        })),
      );
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    if (tab === "overview" || tab === "spaces") {
      void loadStats();
      void loadSpaces();
    } else if (tab === "users") {
      void loadUsers();
    } else if (tab === "switches") {
      void loadAudit();
    }
  }, [user, tab, loadStats, loadSpaces, loadUsers, loadAudit]);

  if (!user) {
    return (
      <main className="mx-auto max-w-sm px-4 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Bảng điều khiển</h1>
          <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">Đăng nhập để xem.</p>
          <Link to="/sign-in" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white">
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-sm px-4 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Không có quyền</h1>
          <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">Trang này chỉ dành cho quản trị viên.</p>
        </div>
      </main>
    );
  }

  const row = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
  const btn = "rounded-lg px-3 py-2 text-[13px] font-semibold text-white shadow transition disabled:opacity-50";
  const card = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <section className={card} data-testid="admin-page">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Bảng điều khiển quản trị <span className="align-middle text-[11px] font-bold text-amber-600">ADMIN</span>
          </h1>
          <span className="text-[12px] text-slate-500">
            @{user.username} · <span className="font-mono">{user.id}</span>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1 text-[13px]">
          {(["overview", "spaces", "users", "switches"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={tab === key ? "rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white" : "rounded-lg px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}
            >
              {key === "overview" ? "Tổng quan" : key === "spaces" ? "Group Spaces" : key === "users" ? "Tài khoản người dùng" : "Công tắc & Nhật ký"}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {stats ? (
              <>
                <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
                  <p className="text-[12px] text-indigo-700 dark:text-indigo-300">Tổng tài khoản</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{String((stats as { users?: { active?: number } }).users?.active ?? "—")}</p>
                </div>
                <div className="rounded-xl bg-violet-50 p-4 dark:bg-violet-950/30">
                  <p className="text-[12px] text-violet-700 dark:text-violet-300">Tổng Group Spaces</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{String((stats as { spaces?: { total?: number } }).spaces?.total ?? "—")}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                  <p className="text-[12px] text-emerald-700 dark:text-emerald-300">Tổng thành viên spaces</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{String((stats as { spaces?: { members?: number } }).spaces?.members ?? "—")}</p>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-slate-400">Đang tải…</p>
            )}
          </div>
        ) : null}

        {tab === "spaces" ? (
          <div className="mt-4" data-testid="admin-spaces">
            <div className="flex flex-wrap gap-2">
              <input className={row + " max-w-xs"} placeholder="Tìm tên nhóm…" value={spaceQuery} onChange={(event) => setSpaceQuery(event.target.value)} />
              <select value={spaceStatus} onChange={(event) => setSpaceStatus(event.target.value)} className={row + " max-w-[200px]"}>
                {STATUSES.map((status) => (
                  <option key={status.key} value={status.key}>{status.label}</option>
                ))}
              </select>
              <button type="button" onClick={() => void loadSpaces()} className={btn + " bg-indigo-600 hover:bg-indigo-500"}>Lọc</button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-1.5">Nhóm</th>
                    <th>Group ID</th>
                    <th>Owner</th>
                    <th>Thành viên</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {spaceRows.map((space) => (
                    <tr key={space.groupId} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-2 font-semibold text-slate-800 dark:text-slate-100">{space.displayName}</td>
                      <td className="font-mono text-[11px] text-slate-500">{space.groupId}</td>
                      <td>@{space.ownerUsername}</td>
                      <td>{space.memberCount}</td>
                      <td>
                        <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + (space.status === "active" ? "bg-emerald-100 text-emerald-700" : space.status === "suspended" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                          {space.status}
                        </span>
                      </td>
                      <td className="space-x-2 whitespace-nowrap">
                        {space.status === "active" ? (
                          <button type="button" className="text-[12px] font-semibold text-amber-600 hover:underline" onClick={() => void adminPost({ userId: space.ownerUserId, action: "space_suspend", groupId: space.groupId }).then((answer) => { setMsg(answer.ok ? { text: `Đã ngừng ${space.displayName}.` } : { text: answer.error, bad: true }); return loadSpaces(); })}>
                            Ngừng
                          </button>
                        ) : null}
                        {space.status === "suspended" ? (
                          <button type="button" className="text-[12px] font-semibold text-emerald-600 hover:underline" onClick={() => void adminPost({ userId: space.ownerUserId, action: "space_unsuspend", groupId: space.groupId }).then((answer) => { setMsg(answer.ok ? { text: `Đã mở khoá ${space.displayName}.` } : { text: answer.error, bad: true }); return loadSpaces(); })}>
                            Mở khoá
                          </button>
                        ) : null}
                        {space.status !== "deleted" ? (
                          <button type="button" className="text-[12px] font-semibold text-red-600 hover:underline" onClick={() => void adminPost({ userId: space.ownerUserId, action: "space_delete", groupId: space.groupId }).then((answer) => { setMsg(answer.ok ? { text: `Đã xoá ${space.displayName}.` } : { text: answer.error, bad: true }); return loadSpaces(); })}>
                            Xoá
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {spaceRows.length === 0 ? <p className="py-3 text-[13px] text-slate-400">Không có nhóm nào khớp bộ lọc.</p> : null}
            </div>
          </div>
        ) : null}

        {tab === "users" ? (
          <div className="mt-4" data-testid="admin-users">
            <div className="flex flex-wrap gap-2">
              <input className={row + " max-w-xs"} placeholder="Tìm username/email…" value={userQuery} onChange={(event) => setUserQuery(event.target.value)} />
              <button type="button" onClick={() => void loadUsers()} className={btn + " bg-indigo-600 hover:bg-indigo-500"}>Tìm</button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-1.5">Người dùng</th>
                    <th>Email</th>
                    <th>Gói</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {userRows.map((adminUser) => (
                    <tr key={adminUser.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-2 font-semibold text-slate-800 dark:text-slate-100">{adminUser.name}<span className="ml-1 text-slate-400">@{adminUser.username}</span></td>
                      <td className="text-slate-500">{adminUser.email}</td>
                      <td>
                        <select
                          className="rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-[12px] dark:border-slate-600 dark:bg-slate-900"
                          value={adminUser.plan ?? "free"}
                          onChange={(event) => {
                            const next = event.target.value;
                            event.target.value = adminUser.plan ?? "free";
                            void adminPost({ userId: adminUser.id, action: "set_plan", plan: next }).then((answer) => {
                              setMsg(answer.ok ? { text: `Đã đặt gói cho ${adminUser.name} thành ${next === "basic" ? "Basic" : next === "premium" ? "Premium" : "Miễn phí"}.` } : { text: answer.error, bad: true });
                              return loadUsers();
                            });
                          }}
                        >
                          <option value="free">Miễn phí</option>
                          <option value="basic">Basic (tuần)</option>
                          <option value="premium">Premium (tháng)</option>
                        </select>
                      </td>
                      <td>
                        <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + (adminUser.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{adminUser.status}</span>
                      </td>
                      <td className="space-x-2 whitespace-nowrap">
                        {adminUser.status === "active" ? (
                          <button type="button" className="text-[12px] font-semibold text-amber-600 hover:underline" onClick={() => void adminPost({ userId: adminUser.id, action: "deactivate" }).then((answer) => { setMsg(answer.ok ? { text: "Đã deactivate." } : { text: answer.error, bad: true }); return loadUsers(); })}>
                            Deactivate
                          </button>
                        ) : (
                          <button type="button" className="text-[12px] font-semibold text-emerald-600 hover:underline" onClick={() => void adminPost({ userId: adminUser.id, action: "activate" }).then((answer) => { setMsg(answer.ok ? { text: "Đã activate." } : { text: answer.error, bad: true }); return loadUsers(); })}>
                            Activate
                          </button>
                        )}
                        <button type="button" className="text-[12px] font-semibold text-red-600 hover:underline" onClick={() => void adminPost({ userId: adminUser.id, action: "delete_account" }).then((answer) => { setMsg(answer.ok ? { text: "Đã xoá tài khoản." } : { text: answer.error, bad: true }); return loadUsers(); })}>
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userRows.length === 0 ? <p className="py-3 text-[13px] text-slate-400">Không tìm thấy người dùng nào.</p> : null}
            </div>
          </div>
        ) : null}

        {tab === "switches" ? (
          <div className="mt-4 space-y-4" data-testid="admin-switches">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Cho phép tạo Group Space toàn hệ thống</p>
              <p className="mt-1 text-[12px] text-slate-500">Khi tắt, chỉ Admin tạo được Group Space mới.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => void adminPost({ userId: user.id, action: "toggle_space_creation", enabled: true }).then((answer) => setMsg(answer.ok ? { text: "Đã bật tạo Group Space." } : { text: answer.error, bad: true }))} className={btn + " bg-emerald-600 hover:bg-emerald-500"}>Bật</button>
                <button type="button" onClick={() => void adminPost({ userId: user.id, action: "toggle_space_creation", enabled: false }).then((answer) => setMsg(answer.ok ? { text: "Đã tắt tạo Group Space." } : { text: answer.error, bad: true }))} className={btn + " bg-amber-600 hover:bg-amber-500"}>Tắt</button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Nhật ký kiểm soát (mới nhất 15)</p>
              <ul className="mt-2 space-y-1 text-[12px] text-slate-600 dark:text-slate-300">
                {auditRows.map((auditRow) => (
                  <li key={auditRow.at + auditRow.action} className="border-b border-slate-100 py-1 dark:border-slate-800">
                    <span className="font-mono text-[11px] text-slate-400">{auditRow.at}</span>{" "}
                    <b>{auditRow.action}</b> → <span className="font-mono">{auditRow.target}</span>
                    {auditRow.detail ? ` · ${auditRow.detail}` : ""} <span className="text-slate-400">bởi @{auditRow.byUsername}</span>
                  </li>
                ))}
                {auditRows.length === 0 ? <li className="py-2 text-slate-400">Chưa có sự kiện nào.</li> : null}
              </ul>
            </div>
          </div>
        ) : null}
      </section>
      {msg ? (
        <p className={msg.bad ? "text-[13px] text-red-600 dark:text-red-400" : "text-[13px] text-emerald-600 dark:text-emerald-400"}>
          {msg.text}
        </p>
      ) : null}
    </main>
  );
}
