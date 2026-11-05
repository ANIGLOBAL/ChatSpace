import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate, useParams } from "react-router";

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

const PLACEHOLDER = (
  <p className="text-[13px] text-slate-400">Đang tải không gian…</p>
);

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
    if (meta?.membership !== undefined && meta.membership !== "none") loadMembers();
    loadRequests();
  }, [meta, loadMembers, loadRequests]);

  // Chat history (members only).
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

  // Realtime.
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
      const shape = data as { type?: string; message?: Omit<ChatMessage, "mine">; stones?: string };
      if (shape.type === "message" && shape.message) {
        setMessages((prev) => {
          const list = prev ?? [];
          if (list.some((one) => one.id === shape.message!.id)) return list;
          const mine = me ? shape.message!.senderId === me.id : false;
          const next = [...list, { ...shape.message!, mine }];
          return next.sort((a, b) => a.seq - b.seq);
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

  if (!meta) return <main className="mx-auto max-w-5xl px-4 py-10">{PLACEHOLDER}</main>;
  if (meta.exists === false) {
    return (
      <main className="mx-auto max-w-xl px-4 py-14">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Không tìm thấy không gian</h1>
        <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
          Group ID không tồn tại, đã bị xoá, hoặc bạn không được phép nhìn thấy nó.
        </p>
        <Link to="/" className="mt-4 inline-block font-semibold text-indigo-600 dark:text-indigo-400">Về trang chính</Link>
      </main>
    );
  }
  if (meta.membership === "none" || meta.membership === undefined) {
    return (
      <main className="mx-auto max-w-xl px-4 py-14" data-testid="nonmember-view">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Không gian riêng tư</h1>
        <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
          Bạn chưa phải thành viên.{" "}
          {meta.requireOwnerApproval ? "Chủ nhóm duyệt từng yêu cầu tham gia." : "Nhóm cho phép tham gia trực tiếp."}
        </p>
        <button
          type="button"
          onClick={async () => {
            const answer = await api<{ membership?: string }>(`/api/spaces/${groupId}/join`, { method: "POST" });
            if (answer.ok) {
              const state = answer.data.membership;
              setNotice(state === "pending" ? "Đã gửi yêu cầu, chờ chủ nhóm duyệt." : "Đã tham gia.");
              loadMeta();
            } else {
              setNotice(answer.error || "Không thể tham gia lúc này.");
            }
          }}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-[14px] font-semibold text-white hover:bg-indigo-500"
        >
          Tham gia
        </button>
        {notice ? <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-300">{notice}</p> : null}
      </main>
    );
  }

  const isOwner = meta.role === "owner";
  const isAdmin = isOwner || meta.role === "admin";

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
      if (answer.status === 413) setChatError("Tin nhắn quá dài.");
      else if (answer.status === 429) setChatError("Gửi quá nhanh, nghỉ một chút.");
      else setChatError(answer.error);
      return;
    }
        socketRef.current?.send(JSON.stringify({ type: "message", body: text }));
    // Optimistic: rely on WS echo; POST returns ours — reconcile.
    setMessages((prev) => {
      const list = prev ?? [];
      if (list.some((one) => one.id === answer.data.message.id)) return list;
      return [...list, { ...answer.data.message, mine: true }].sort((a, b) => a.seq - b.seq);
    });
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{meta.displayName}</h1>
          <p className="text-[13px] text-slate-500">
            Group ID <span className="font-mono">{meta.groupId}</span> · {members.length} thành viên
            {meta.status === "suspended" ? " · ĐANG BỊ TẠM NGỪNG" : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await api(`/api/spaces/${groupId}/leave`, { method: "DELETE" });
              navigate("/");
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Rời nhóm
          </button>
        </div>
      </div>
      {meta.status === "suspended" ? (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-800">
          Nhóm bị quản trị ChatIndex tạm ngừng: chỉ đọc, không thể nhắn tin cho tới khi được mở khoá.
        </p>
      ) : null}
      {notice ? <p className="mt-3 text-[13px] text-emerald-600 dark:text-emerald-400">{notice}</p> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
        <section className="rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="max-h-[60vh] min-h-[320px] overflow-y-auto p-4" data-testid="chat-scroll">
            {messages === null ? (
              <p className="text-[13px] text-slate-400">{chatError ?? "Đang tải hội thoại…"}</p>
            ) : messages.length === 0 ? (
              <p className="text-[13px] text-slate-400">Chưa có tin nhắn nào. Bắt đầu bằng một lời chào.</p>
            ) : (
              <ul className="space-y-2.5">
                {messages.map((message) => (
                  <li key={message.id} className={"flex " + (message.mine ? "justify-end" : "justify-start")}>
                    <div>
                      {!message.mine ? (
                        <p className="mb-0.5 text-[11px] text-slate-400">{message.senderName}</p>
                      ) : null}
                      <div
                        className={
                          message.mine
                            ? "max-w-[70%] rounded-2xl bg-indigo-600 px-4 py-2.5 text-[14px] text-white"
                            : "max-w-[70%] rounded-2xl bg-slate-100 px-4 py-2.5 text-[14px] text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                        }
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      </div>
                      <p className={"mt-0.5 text-[10px] text-slate-400 " + (message.mine ? "text-right" : "")}>
                        {message.sentAt}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div ref={bottomRef} />
          </div>
          {meta.status === "active" ? (
            <form
              className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-700"
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
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
                          <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-indigo-500"
              >
                Gửi
              </button>
            </form>
          ) : null}
          {chatError ? <p className="px-3 pb-3 text-[12px] text-red-600 dark:text-red-400">{chatError}</p> : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700" data-testid="roster">
            <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Thành viên</h3>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              {members.map((member) => (
                <li key={member.userId} className="flex items-center gap-2">
                  <Link to={`/members/${member.userId}`} className="text-slate-700 hover:underline dark:text-slate-200">
                    {member.name || "@" + member.username}
                  </Link>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {member.role}
                  </span>
                  {isAdmin && member.role === "member" ? (
                    <button
                      type="button"
                      title="Đá khỏi nhóm"
                      className="ml-auto text-[11px] text-red-500 hover:underline"
                      onClick={async () => {
                        await api(`/api/spaces/${groupId}/members/${member.userId}`, { method: "DELETE" });
                        loadMembers();
                        setNotice(`Đã đá ${member.username}.`);
                      }}
                    >
                      Đá
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {isOwner ? (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700" data-testid="owner-panel">
              <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Cài đặt Owner</h3>
              <label className="mt-2 flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200">
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
              <NavLink
                to="/control"
                className="mt-2 block text-[12px] font-semibold text-indigo-600 dark:text-indigo-400"
              >
                Chuyển quyền / xoá nhóm → xem trang Tài khoản
              </NavLink>
              {requests.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                    Yêu cầu chờ duyệt ({requests.length})
                  </p>
                  <ul className="mt-1 space-y-1.5 text-[13px]">
                    {requests.map((joinRequest) => (
                      <li key={joinRequest.requestId} className="flex items-center gap-2">
                        <span className="truncate">{joinRequest.name || "@" + joinRequest.username}</span>
                        <button
                          type="button"
                          className="ml-auto font-semibold text-emerald-600"
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
                          className="font-semibold text-red-500"
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
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
