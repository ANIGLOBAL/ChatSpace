import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";

import { api, uploadImageFile, type MiniUser, type SpaceRow } from "~/lib/api";

type OutletCtx = { user: MiniUser | null; refreshUser: () => void };

type ModalMode = "chat" | "create" | "join" | null;

export default function Home() {
  const { user } = useOutletContext<OutletCtx>();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<SpaceRow[] | null>(null);
  const [owned, setOwned] = useState<number>(0);
  const [modal, setModal] = useState<ModalMode>(null);
  const [dmPick, setDmPick] = useState(true);
  const [joinId, setJoinId] = useState("");
  const [dmPeerId, setDmPeerId] = useState("");
  const [dmLink, setDmLink] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createApproval, setCreateApproval] = useState(false);
  const [spaceAvatar, setSpaceAvatar] = useState<File | null>(null);
  const [spaceCover, setSpaceCover] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, [user]);

  function refresh() {
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
  }

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

  async function createSpace() {
    setBusy(true);
    const answer = await api<{ groupSpace: SpaceRow }>("/api/spaces", {
      method: "POST",
      body: JSON.stringify({
        displayName: createName,
        description: createDescription || undefined,
        requireOwnerApproval: createApproval,
      }),
    });
    if (!answer.ok) {
      setMsg({ text: answer.error, bad: true });
      setBusy(false);
      return;
    }
    const groupId = answer.data.groupSpace.groupId;
    let extra: string | null = null;
    if (spaceAvatar || spaceCover) {
      let avatarId: string | null = null;
      let coverId: string | null = null;
      if (spaceAvatar) avatarId = await uploadImageFile(spaceAvatar);
      if (spaceCover) coverId = await uploadImageFile(spaceCover);
      const patch: Record<string, string | null> = {};
      if (avatarId) patch.avatarFileId = avatarId;
      if (coverId) patch.coverFileId = coverId;
      if (Object.keys(patch).length > 0) {
        const patched = await api(`/api/spaces/${groupId}`, { method: "PATCH", body: JSON.stringify(patch) });
        if (!patched.ok) extra = patched.error;
      }
    }
    if (extra) setMsg({ text: extra, bad: true });
    setModal(null);
    setCreateName("");
    setCreateDescription("");
    setCreateApproval(false);
    setSpaceAvatar(null);
    setSpaceCover(null);
    setBusy(false);
    navigate(`groups/${groupId}`);
  }

  function browseFile(target: "avatar" | "cover") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const picked = input.files?.[0] ?? null;
      if (!picked) return;
      if (target === "avatar") setSpaceAvatar(picked);
      else setSpaceCover(picked);
    };
    input.click();
  }

  async function createDm() {
    const peer = dmPeerId.trim().toLowerCase();
    if (!peer) {
      setMsg({ text: "Nhập tên người dùng (username) của người kia.", bad: true });
      return;
    }
    setBusy(true);
    const answer = await api<{ conversation?: { id: string }; id?: string }>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ kind: "dm", username: peer }),
    });
    setBusy(false);
    if (!answer.ok) {
      setMsg({ text: answer.error, bad: true });
      return;
    }
    const conversationId = answer.data.conversation?.id ?? answer.data.id;
    const url = `https://aniglobal.github.io/ChatIndex/dm/${conversationId ?? ""}`;
    setDmLink(url);
    setMsg({ text: `DM đã sẵn sàng — mở ChatIndex để nhắn: ${url}` });
    setDmPeerId("");
  }

  async function joinSpace() {
    if (!joinId.trim()) return;
    setBusy(true);
    const answer = await api(`/api/spaces/${joinId.trim()}/join`, { method: "POST" });
    if (!answer.ok) {
      setMsg({ text: answer.error, bad: true });
      setBusy(false);
      return;
    }
    setJoinId("");
    setModal(null);
    setBusy(false);
    navigate(`groups/${joinId.trim()}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Xin chào, {user.name}
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            @{user.username} · ID định danh: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{user.id}</span>
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setDmLink(null);
              setDmPick(true);
              setModal("chat");
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow transition hover:bg-indigo-500"
            data-testid="open-chat"
          >
            ＋ Thêm trò chuyện
          </button>
          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setModal("create");
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow transition hover:bg-indigo-500 hidden"
            data-testid="open-create"
          >
            + Tạo Group Space
          </button>
          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setModal("join");
            }}
            className="rounded-xl border border-indigo-600 bg-white px-4 py-2.5 text-[14px] font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-slate-800 hidden"
            data-testid="open-join"
          >
            Tham gia bằng Group ID
          </button>
        </div>
      </div>

      {msg ? (
        <p className={msg.bad ? "mt-3 text-[14px] text-red-600 dark:text-red-400" : "mt-3 text-[14px] text-emerald-600 dark:text-emerald-400"}>
          {msg.text}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Không gian của bạn</h2>
        {spaces === null ? (
          <p className="mt-3 text-[14px] text-slate-500">Đang tải…</p>
        ) : spaces.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
            <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">Chưa có không gian nào</p>
            <p className="mt-1 text-[13px] text-slate-500">Tạo Group Space của riêng bạn hoặc tham gia bằng Group ID.</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {spaces.map((space) => (
              <li
                key={space.groupId}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                data-testid={`space-card-${space.groupId}`}
              >
                <Link to={`/groups/${space.groupId}`} className="block p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                      {(space.displayName || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-900 dark:text-white">{space.displayName}</span>
                      <span className="block text-[12px] text-slate-500">
                        {space.status === "suspended" ? "⚠ Tạm ngừng" : space.requireOwnerApproval ? "Cần Owner duyệt" : "Tham gia trực tiếp"}
                      </span>
                    </span>
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {space.role === "owner" ? "OWNER" : space.role === "admin" ? "ADMIN" : "MEMBER"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] text-slate-500 dark:text-slate-400">{space.description || "Không có mô tả"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modal === "chat" ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" data-testid="modal-chat">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Thêm trò chuyện</h2>
              <button type="button" aria-label="Đóng" onClick={() => setModal(null)} className="ml-auto rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
            </div>
            <p className="mt-1 text-[12px] text-slate-500">Chọn 1 trong 2 loại trò chuyện rồi mới nhập ID.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="tile-dm"
                onClick={() => setDmPick(true)}
                className={"rounded-xl border p-4 text-left transition " + (dmPick ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300 dark:bg-indigo-950/40" : "border-indigo-200 dark:border-indigo-900")}
              >
                <span className="text-2xl">💬</span>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">DM cá nhân</p>
                <p className="mt-0.5 text-[12px] text-slate-500">Nhắn với đúng 1 người — cần username của họ.</p>
                {dmPick ? <p className="mt-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-300">✓ ĐÃ CHỌN</p> : null}
              </button>
              <button
                type="button"
                data-testid="tile-group"
                onClick={() => setDmPick(false)}
                className={"rounded-xl border p-4 text-left transition " + (!dmPick ? "border-violet-500 bg-violet-50 ring-2 ring-violet-300 dark:bg-violet-950/40" : "border-violet-200 dark:border-violet-900")}
              >
                <span className="text-2xl">👥</span>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">Group Space</p>
                <p className="mt-0.5 text-[12px] text-slate-500">Tạo mới hoặc tham gia bằng Group ID.</p>
                {!dmPick ? <p className="mt-1 text-[11px] font-bold text-violet-600 dark:text-violet-300">✓ ĐÃ CHỌN</p> : null}
              </button>
            </div>
            {dmPick ? (
              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700" data-testid="dm-form">
                <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                  Nhập tên người dùng (username) của người thân thiết
                  <input value={dmPeerId} onChange={(event) => setDmPeerId(event.target.value)} placeholder="username (ví dụ: qa-cs-b)" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900" />
                </label>
                <button type="button" disabled={busy} onClick={() => void createDm()} className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-indigo-500" data-testid="btn-create-dm">
                  Tạo cuộc trò chuyện 1–1
                </button>
                {dmLink ? (
                  <p className="text-[11px] break-all text-slate-500">
                    Mở: <a className="font-semibold text-indigo-600 underline" href={dmLink}>{dmLink}</a> (ChatIndex DM)
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  data-testid="btn-join-open"
                  onClick={() => setModal("join")}
                  className="w-full rounded-xl border border-indigo-600 bg-white px-3 py-2.5 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  Tham gia bằng Group ID
                </button>
                <button
                  type="button"
                  data-testid="btn-create-open"
                  onClick={() => setModal("create")}
                  className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-indigo-500"
                >
                  Tạo Group Space mới
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {modal && modal !== "chat" ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" data-testid="modal">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {modal === "create" ? "Tạo Group Space" : "Tham gia bằng Group ID"}
              </h2>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => {
                  setModal(null);
                  setBusy(false);
                }}
                className="ml-auto rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            {modal === "create" ? (
              <>
                <p className="mt-1 text-[12px] text-slate-500">
                  {owned >= 1 ? "Bạn đã sở hữu ít nhất 1 không gian." : "Mỗi tài khoản sở hữu giới hạn: Free 1, Basic 2, Premium 3. Admin không giới hạn."}
                </p>
                <div className="mt-3 space-y-3">
                  <input
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Tên không gian (1–80 ký tự)"
                    maxLength={80}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <textarea
                    value={createDescription}
                    onChange={(event) => setCreateDescription(event.target.value)}
                    placeholder="Mô tả (không bắt buộc)"
                    maxLength={500}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => browseFile("avatar")}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {spaceAvatar ? "Avatar ✓" : "Ảnh đại diện"}
                    </button>
                    <button
                      type="button"
                      onClick={() => browseFile("cover")}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {spaceCover ? "Ảnh bìa ✓" : "Ảnh bìa"}
                    </button>
                    <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200">
                      <input type="checkbox" checked={createApproval} onChange={(event) => setCreateApproval(event.target.checked)} />
                      Duyệt thành viên
                    </label>
                  </div>
                  {spaceAvatar ? (
                    <img src={URL.createObjectURL(spaceAvatar)} alt="avatar preview" className="h-16 w-16 rounded-xl object-cover" />
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy || createName.trim().length === 0}
                      onClick={() => void createSpace()}
                      className="flex-1 rounded-xl bg-indigo-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                      data-testid="btn-create"
                    >
                      Tạo không gian
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-[12px] text-slate-500">Dán Group ID dạng cs-… mà chủ nhóm chia sẻ.</p>
                <input
                  value={joinId}
                  onChange={(event) => setJoinId(event.target.value)}
                  placeholder="cs-xxxxxxxx"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !busy) void joinSpace();
                  }}
                  className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void joinSpace()}
                    className="flex-1 rounded-xl bg-indigo-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-indigo-500"
                    data-testid="btn-join"
                  >
                    Yêu cầu tham gia
                  </button>
                  <button type="button" onClick={() => setModal(null)} className="rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                    Huỷ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
