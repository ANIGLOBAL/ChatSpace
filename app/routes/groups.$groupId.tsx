import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { api, apiWsUrl, getSessionUser, type MiniUser } from "~/lib/api";

type ChatMessage = {
  seq: number;
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  body: string;
  attachment: { id: string; name: string; mimeType: string; kind: "image" | "file"; size: number } | null;
  sentAt: string;
  mine: boolean;
};

type MemberRow = {
  userId: string;
  username: string;
  name: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
};

type JoinRequestRow = { requestId: string; userId: string; username: string; name: string; createdAt: string };

type SpaceMeta = {
  groupId: string;
  conversationId?: string;
  displayName?: string;
  description?: string | null;
  status?: string;
  requireOwnerApproval?: boolean;
  ownerUserId?: string;
  role?: "owner" | "admin" | "member";
  exists?: boolean;
  membership?: string;
};

export default function GroupPage() {
  const params = useParams();
  const groupId = String(params.groupId ?? "");
  const navigate = useNavigate();
  const [me, setMe] = useState<MiniUser | null>(null);
  const [meta, setMeta] = useState<SpaceMeta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [requests, setRequests] = useState<JoinRequestRow[]>([]);
  const [draft, setDraft] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rename, setRename] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getSessionUser().then((user) => setMe(user));
  }, []);

  const loadMeta = useCallback(() => {
    api<SpaceMeta>(`/api/spaces/${groupId}`).then((result) => {
      if (result.ok) setMeta({ ...result.data, exists: true });
      else if (result.status === 404) setMeta({ groupId, exists: false });
    });
  }, [groupId]);

  const loadMembers = useCallback(() => {
    api<{ members: MemberRow[] }>(`/api/spaces/${groupId}/members`).then((result) => {
      if (result.ok) setMembers(result.data.members);
    });
  }, [groupId]);

  const loadRequests = useCallback(() => {
    if (meta?.role !== "owner") return;
    api<{ requests: JoinRequestRow[] }>(`/api/spaces/${groupId}/requests`).then((result) => {
      if (result.ok) setRequests(result.data.requests);
    });
  }, [groupId, meta?.role]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (meta?.membership !== undefined && meta.membership !== "none") {
      loadMembers();
      if (meta?.role === "owner") loadRequests();
    }
  }, [meta, loadMembers, loadRequests]);

  const conversationId = meta?.conversationId ?? null;
  useEffect(() => {
    if (!conversationId) {
      setMessages(null);
      return;
    }
    api<{ messages: ChatMessage[] }>(`/api/spaces/${groupId}/messages`).then((result) => {
      setMessages(result.ok ? result.data.messages : null);
      if (!result.ok) setChatError(result.error);
    });
  }, [conversationId, groupId]);

  useEffect(() => {
    if (!conversationId) return;
    const socket = new WebSocket(apiWsUrl(conversationId));
    socketRef.current = socket;
    socket.onmessage = (event) => {
      let data: unknown = null;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const shape = data as { type?: string; message?: Omit<ChatMessage, "mine"> };
      if (shape.type === "message" && shape.message) {
        setMessages((prev) => {
          const list = prev ?? [];
          if (list.some((one) => one.id === shape.message!.id)) return list;
          const mine = me ? shape.message!.senderId === me.id : false;
          return [...list, { ...shape.message!, mine }].sort((a, b) => a.seq - b.seq);
        });
        void api(`/api/spaces/${groupId}/messages/read`, { method: "PUT" });
      }
    };
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [conversationId, groupId, me]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  if (!meta) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-[13px] text-slate-400">Đang tải không gian…</p>
      </main>
    );
  }
  if (meta.exists === false) {
    return (
      <main className="mx-auto max-w-xl px-4 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Không tìm thấy không gian</h1>
          <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
            Group ID không tồn tại, đã bị xoá, hoặc bạn không có quyền thấy nó (riêng tư tuyệt đối —
            không hé lộ chi tiết nhóm).
          </p>
          <Link to="/" className="mt-4 inline-block font-semibold text-indigo-600 dark:text-indigo-400">
            ← Về trang không gian
          </Link>
        </div>
      </main>
    );
  }
  if (meta.membership === "none") {
    return (
      <main className="mx-auto max-w-xl px-4 py-14" data-testid="nonmember-view">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-100 text-2xl dark:bg-indigo-900/40">🔐</span>
          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            {meta.requireOwnerApproval ? "Không gian cần phê duyệt" : "Không gian riêng tư"}
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-slate-600 dark:text-slate-300">
            Bạn chưa là thành viên nên không xem được nội dung.{" "}
            {meta.requireOwnerApproval
              ? "Yêu cầu sẽ được chủ nhóm duyệt từng lượt (tối đa 5 yêu cầu/phút)."
              : "Không gian này cho phép tham gia trực tiếp."}
          </p>
          <button
            type="button"
            onClick={async () => {
              const answer = await api<{ membership?: string }>(`/api/spaces/${groupId}/join`, { method: "POST" });
              if (answer.ok) {
                const state = answer.data.membership;
                setNotice(state === "pending" ? "Đã gửi yêu cầu — chờ chủ nhóm duyệt." : "Đã tham gia! Đang mở nhóm…");
                if (state !== "pending") loadMeta();
              } else {
                setNotice(answer.error);
              }
            }}
            className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow transition hover:bg-indigo-500"
          >
            Tham gia
          </button>
          {notice ? <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-300">{notice}</p> : null}
        </div>
      </main>
    );
  }

  const isOwner = meta.role === "owner";
  const isAdmin = isOwner || meta.role === "admin";
  const suspended = meta.status === "suspended";

  async function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setChatError(null);
    const answer = await api<{ message: Omit<ChatMessage, "mine"> }>(`/api/spaces/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: text }),
    });
    if (!answer.ok) {
      if (answer.status === 413) setChatError("Tin nhắn quá dài (tối đa 4000 ký tự).");
      else if (answer.status === 429) setChatError("Gửi quá nhanh, nghỉ một chút rồi thử lại.");
      else setChatError(answer.error);
      return;
    }
    socketRef.current?.send(JSON.stringify({ type: "message", body: text }));
    setMessages((prev) => {
      const list = prev ?? [];
      if (list.some((one) => one.id === answer.data.message.id)) return list;
      return [...list, { ...answer.data.message, mine: true }].sort((a, b) => a.seq - b.seq);
    });
  }

  const root = import.meta.env.BASE_URL;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 p-6 text-white shadow">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur">
            {(meta.displayName || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{meta.displayName}</h1>
            <p className="mt-0.5 text-[13px] text-white/80">
              <span className="font-mono" data-testid="group-id">{meta.groupId}</span>
              {" · "}
              {members.length} thành viên
              {suspended ? " · ⚠ ĐANG TẠM NGỪNG" : ""}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isOwner ? (
              <button
                type="button"
                onClick={() => setShowSettings((show) => !show)}
                className="rounded-lg bg-white/15 px-3 py-2 text-[13px] font-semibold backdrop-blur transition hover:bg-white/25"
              >
                Cài đặt Owner
              </button>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                await api(`/api/spaces/${groupId}/leave`, { method: "DELETE" });
                navigate(`${root}`);
              }}
              className="rounded-lg bg-white/15 px-3 py-2 text-[13px] font-semibold backdrop-blur transition hover:bg-white/25"
            >
              Rời nhóm
            </button>
          </div>
        </div>
      </div>

      {suspended ? (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-300">
          Nhóm bị quản trị ChatIndex tạm ngừng (vi phạm). Lúc này chỉ đọc — không thể gửi tin nhắn cho tới khi mở khoá.
        </p>
      ) : null}
      {notice ? <p className="mt-4 text-[13px] text-emerald-600 dark:text-emerald-400">{notice}</p> : null}

      {showSettings && isOwner ? (
        <section className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20" data-testid="owner-settings">
          <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Cài đặt Owner</h3>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-[13px] text-slate-700 dark:text-slate-200">
              <span className="block font-semibold">Đổi tên nhóm</span>
              <input
                value={rename}
                onChange={(event) => setRename(event.target.value)}
                placeholder={meta.displayName}
                maxLength={80}
                className="mt-1 w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                if (!rename.trim()) return;
                await api(`/api/spaces/${groupId}`, { method: "PATCH", body: JSON.stringify({ displayName: rename.trim() }) });
                setRename("");
                setNotice("Đã đổi tên nhóm.");
                loadMeta();
              }}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-indigo-500"
            >
              Lưu
            </button>
            <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200" data-testid="approval-switch">
              <input
                type="checkbox"
                checked={meta.requireOwnerApproval === true}
                onChange={async (event) => {
                  await api(`/api/spaces/${groupId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ requireOwnerApproval: event.target.checked }),
                  });
                  loadMeta();
                }}
              />
              Duyệt thành viên mới
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3" data-testid="transfer-row">
            <label className="text-[13px] text-slate-700 dark:text-slate-200">
              <span className="block font-semibold">Chuyển quyền Owner cho</span>
              <input
                value={transferTo}
                onChange={(event) => setTransferTo(event.target.value)}
                placeholder="userId thành viên"
                className="mt-1 w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                const answer = await api(`/api/spaces/${groupId}/transfer`, {
                  method: "POST",
                  body: JSON.stringify({ userId: transferTo.trim() }),
                });
                setNotice(answer.ok ? "Đã chuyển quyền — bạn giờ là Admin." : answer.error);
                setTransferTo("");
                loadMeta();
                loadMembers();
              }}
              className="rounded-lg bg-amber-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-amber-500"
            >
              Chuyển quyền
            </button>
            <button
              type="button"
              onClick={async () => {
                const answer = await api(`/api/spaces/${groupId}`, { method: "DELETE" });
                if (answer.ok) navigate(`${root}`);
                else setNotice(answer.error);
              }}
              className="rounded-lg bg-red-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-red-500"
              data-testid="delete-space"
            >
              Xoá không gian
            </button>
          </div>
          {requests.length > 0 ? (
            <div className="mt-4 border-t border-indigo-200/60 pt-3" data-testid="requests-panel">
              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                Yêu cầu chờ duyệt ({requests.length})
              </p>
              <ul className="mt-2 space-y-1.5 text-[13px]">
                {requests.map((joinRequest) => (
                  <li key={joinRequest.requestId} className="flex items-center gap-3">
                    <span className="truncate text-slate-700 dark:text-slate-200">
                      {joinRequest.name || "@" + joinRequest.username}
                    </span>
                    <span className="text-slate-400">@{joinRequest.username}</span>
                    <button
                      type="button"
                      className="ml-auto font-semibold text-emerald-600 hover:underline"
                      onClick={async () => {
                        await api(`/api/spaces/${groupId}/requests/${joinRequest.requestId}`, {
                          method: "POST",
                          body: JSON.stringify({ action: "approve" }),
                        });
                        loadRequests();
                        loadMembers();
                      }}
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-red-500 hover:underline"
                      onClick={async () => {
                        await api(`/api/spaces/${groupId}/requests/${joinRequest.requestId}`, {
                          method: "POST",
                          body: JSON.stringify({ action: "reject" }),
                        });
                        loadRequests();
                      }}
                    >
                      Từ chối
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-[60vh] min-h-[380px] flex-1 overflow-y-auto p-4" data-testid="chat-scroll">
            {messages === null ? (
              <p className="text-[13px] text-slate-400">{chatError ?? "Đang mở hội thoại…"}</p>
            ) : messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">Chưa có tin nhắn nào</p>
                  <p className="mt-1 text-[13px] text-slate-400">Gửi chào đầu tiên để mở khoá cuộc trò chuyện.</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {messages.map((message) => (
                  <li key={message.id} className={"flex gap-2 " + (message.mine ? "flex-row-reverse" : "")}>
                    {!message.mine ? (
                      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-slate-200 text-[12px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {(message.senderName || message.senderUsername).slice(0, 1).toUpperCase()}
                      </span>
                    ) : null}
                    <div className={"max-w-[72%] " + (message.mine ? "items-end" : "")}>
                      <div
                        className={
                          message.mine
                            ? "rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2 text-[14px] leading-6 text-white shadow-sm"
                            : "rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2 text-[14px] leading-6 text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                        }
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      </div>
                      <p className={"mt-1 text-[10px] text-slate-400 " + (message.mine ? "text-right" : "")}>
                        {message.mine ? "Bạn" : message.senderName} · {message.sentAt}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div ref={bottomRef} />
          </div>
          {suspended ? null : (
            <form
              className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Nhập tin nhắn…"
                maxLength={4000}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow transition hover:bg-indigo-500"
              >
                Gửi
              </button>
            </form>
          )}
          {chatError ? <p className="px-3 pb-3 text-[12px] text-red-600 dark:text-red-400">{chatError}</p> : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" data-testid="roster">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Thành viên</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {members.length}
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-[13px]">
              {members.map((member) => (
                <li key={member.userId} className="flex items-center gap-2">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    {(member.name || member.username).slice(0, 1).toUpperCase()}
                  </span>
                  <Link to={`members/${member.userId}`} className="min-w-0 truncate text-slate-700 hover:underline dark:text-slate-200">
                    {member.name || "@" + member.username}
                  </Link>
                  <span
                    className={
                      "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold " +
                      (member.role === "owner"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : member.role === "admin"
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")
                    }
                  >
                    {member.role}
                  </span>
                  {isAdmin && member.role === "member" ? (
                    <button
                      type="button"
                      title="Đá khỏi nhóm"
                      className="text-[11px] font-bold text-red-500 hover:underline"
                      onClick={async () => {
                        const answer = await api(`/api/spaces/${groupId}/members/${member.userId}`, { method: "DELETE" });
                        setNotice(answer.ok ? `Đã đá ${member.username}.` : answer.error);
                        loadMembers();
                      }}
                    >
                      Đá
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-[12px] leading-5 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <p className="font-bold text-slate-700 dark:text-slate-200">Bảo mật nhóm</p>
            <p className="mt-1">
              Tin nhắn lưu mã hoá AES-GCM bằng khoá hội thoại; người ngoài nhóm không đọc được kể cả khi biết
              Group ID. Rời nhóm mất quyền realtime ngay lập tức.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
