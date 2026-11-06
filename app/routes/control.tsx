import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";

import { api, apiBase, uploadImageFile, type MiniUser } from "~/lib/api";

type OutletCtx = { user: MiniUser | null; refreshUser: () => void };

type OwnedSpace = { groupId: string; displayName: string; status: string };

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

const PLAN_LABELS: Record<string, string> = {
  free: "Miễn phí",
  basic: "Basic (tuần)",
  premium: "Premium (tháng)",
};

function adminPost(body: Record<string, unknown>) {
  return api("/api/admin", { method: "POST", body: JSON.stringify(body) });
}

function picPreview(file: File | null) {
  return file ? URL.createObjectURL(file) : null;
}

export default function Control() {
  const { user, refreshUser } = useOutletContext<OutletCtx>();
  const navigate = useNavigate();
  const [owned, setOwned] = useState<OwnedSpace | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  // Profile editable
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Admin tab state
  const [tab, setTab] = useState<"profile" | "spaces" | "users" | "switches">("profile");
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [spaceQuery, setSpaceQuery] = useState("");
  const [spaceStatus, setSpaceStatus] = useState("");
  const [spaceRows, setSpaceRows] = useState<SpaceAdminRow[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userRows, setUserRows] = useState<AdminUserRow[]>([]);
  const [auditRows, setAuditRows] = useState<{ action: string; target: string; detail: string | null; at: string; byUsername: string }[]>([]);

  useEffect(() => {
    if (user) setDisplayName(user.name);
  }, [user]);

  useEffect(() => {
    api<{ spaces: (OwnedSpace & { role: string })[] }>("/api/spaces").then((result) => {
      if (!result.ok) return;
      const mineSpace = result.data.spaces.find((space) => space.role === "owner");
      setOwned(mineSpace ?? null);
    });
  }, []);

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
    if (tab === "spaces") {
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Trang tài khoản</h1>
          <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">Đăng nhập để xem tài khoản của bạn.</p>
          <Link to="/sign-in" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white">
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  async function signOut() {
    await api("/api/auth/sign-out", { method: "POST" });
    refreshUser();
    navigate("/");
  }

  const currentUser = user;

  function browse(pick: "avatar" | "banner") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const picked = input.files?.[0] ?? null;
      if (!picked) return;
      if (picked.type === "image/gif" && pick === "banner") {
        setMsg({ text: "Banner không nhận GIF — dùng PNG/JPG/WebP.", bad: true });
        return;
      }
      if (picked.type === "image/gif" && pick === "avatar") {
        const paid = currentUser.role === "admin" || currentUser.plan === "basic" || currentUser.plan === "premium";
        if (!paid) {
          setMsg({ text: "Chỉ gói trả phí mới dùng GIF làm ảnh đại diện.", bad: true });
          return;
        }
      }
      if (pick === "avatar") setAvatarFile(picked);
      else setBannerFile(picked);
    };
    input.click();
  }

  async function saveProfile() {
    setSaving(true);
    const steps: string[] = [];
    if (displayName.trim() && displayName.trim() !== currentUser.name) {
      const answer = await api("/api/me", { method: "PATCH", body: JSON.stringify({ name: displayName.trim() }) });
      if (!answer.ok) {
        setMsg({ text: answer.error, bad: true });
        setSaving(false);
        return;
      }
      steps.push("đã đổi tên");
    }
    if (avatarFile) {
      const id = await uploadImageFile(avatarFile);
      if (!id) {
        setMsg({ text: "Tải ảnh đại diện thất bại.", bad: true });
        setSaving(false);
        return;
      }
      const answer = await api("/api/me", { method: "PATCH", body: JSON.stringify({ avatarFileId: id }) });
      if (!answer.ok) {
        setMsg({ text: answer.error, bad: true });
        setSaving(false);
        return;
      }
      steps.push("đã đổi ảnh đại diện (ảnh cũ đã xoá)");
    }
    if (bannerFile) {
      const id = await uploadImageFile(bannerFile);
      if (!id) {
        setMsg({ text: "Tải banner thất bại.", bad: true });
        setSaving(false);
        return;
      }
      const answer = await api("/api/me", { method: "PATCH", body: JSON.stringify({ bannerFileId: id }) });
      if (!answer.ok) {
        setMsg({ text: answer.error, bad: true });
        setSaving(false);
        return;
      }
      steps.push("đã đổi banner (ảnh cũ đã xoá)");
    }
    setSaving(false);
    if (steps.length) setMsg({ text: steps.join(", ") + "." });
    setAvatarFile(null);
    setBannerFile(null);
    refreshUser();
  }

  const row = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
  const btn = "rounded-lg px-3 py-2 text-[13px] font-semibold text-white shadow transition disabled:opacity-50";
  const isAdmin = user.role === "admin";
  const card = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      {/* PROFILE */}
      <section className={card} data-testid="profile-card">
        <div className="relative mb-4 h-48 sm:h-56 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500">
          {user.bannerFileId ? (
            <img src={`${apiBase()}/api/files/${user.bannerFileId}`} alt="Banner" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <span className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-md ring-4 ring-white dark:ring-slate-900">
            {user.image ? (
              <img src={`${apiBase()}/api/files/${user.image}`} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              (user.name || "?").slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold text-slate-900 dark:text-white">{user.name}</h1>
            <p className="text-[13px] text-slate-500">
              @{user.username} · ID định danh: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{user.id}</span>
            </p>
          </div>
          <span className={"ml-auto text-[11px] font-bold uppercase " + (user.plan && user.plan !== "free" ? "text-amber-600" : "text-slate-400")}>
            {PLAN_LABELS[user.plan ?? "free"] ?? "Miễn phí"}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Tên hiển thị</span>
            <input className={row + " mt-1"} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Tên hiển thị (1–80 ký tự)" maxLength={80} />
          </label>
          <div className="flex flex-wrap items-start gap-4">
            <div>
              <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Ảnh đại diện</p>
              <p className="mt-0.5 text-[12px] text-slate-500">
                GIF (đang chạy liên tục) chỉ dành cho gói trả phí (Basic/Premium) — gói miễn phí chỉ PNG/JPG/WebP.
              </p>
              <div className="mt-2 flex items-center gap-3">
                {picPreview(avatarFile) ? (
                  <img src={picPreview(avatarFile) ?? ""} alt="Preview" className="h-20 w-20 rounded-2xl object-cover" />
                ) : user.image ? (
                  <img src={`${apiBase()}/api/files/${user.image}`} alt="Avatar hiện tại" className="h-20 w-20 rounded-2xl object-cover" />
                ) : null}
                <button type="button" onClick={() => browse("avatar")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                  {avatarFile ? "Chọn lại avatar" : "Tải ảnh đại diện"}
                </button>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Banner hồ sơ</p>
              <p className="mt-0.5 text-[12px] text-slate-500">Ảnh tĩnh (không GIF) — banner của bạn trên trang tài khoản.</p>
              <div className="mt-2 flex items-center gap-3">
                {picPreview(bannerFile) ? (
                  <img src={picPreview(bannerFile) ?? ""} alt="Banner preview" className="h-20 w-40 rounded-xl object-cover" />
                ) : user.bannerFileId ? (
                  <img src={`${apiBase()}/api/files/${user.bannerFileId}`} alt="Banner hiện tại" className="h-20 w-40 rounded-xl object-cover" />
                ) : null}
                <button type="button" onClick={() => browse("banner")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                  {bannerFile ? "Chọn lại banner" : "Tải banner"}
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={() => void saveProfile()} className={btn + " bg-indigo-600 hover:bg-indigo-500"}>
              Lưu hồ sơ
            </button>
            <button type="button" onClick={signOut} className="rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
              Đăng xuất
            </button>
          </div>
        </div>
      </section>

      {owned && !isAdmin ? (
        <section className={card} data-testid="owner-control">
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
              className={btn + " bg-amber-600 hover:bg-amber-500"}
            >
              Chuyển quyền Owner
            </button>
          </div>
          <div className="mt-4" data-testid="delete-row">
            <button
              type="button"
              onClick={async () => {
                const answer = await api(`/api/spaces/${owned.groupId}`, { method: "DELETE" });
                setMsg(answer.ok ? { text: "Đã xoá không gian. Group ID không dùng lại được." } : { text: answer.error, bad: true });
                setOwned(null);
              }}
              className={btn + " bg-red-600 hover:bg-red-500"}
            >
              Xoá không gian (không hoàn tác)
            </button>
          </div>
        </section>
      ) : null}

      {msg ? (
        <p className={msg.bad ? "text-[13px] text-red-600 dark:text-red-400" : "text-[13px] text-emerald-600 dark:text-emerald-400"}>
          {msg.text}
        </p>
      ) : null}
    </main>
  );
}
