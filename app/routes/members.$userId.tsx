import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { api } from "~/lib/api";

type MemberRow = {
  userId: string;
  username: string;
  name: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
};

export default function MemberPage() {
  const params = useParams();
  const userId = String(params.userId ?? "");
  const [member, setMember] = useState<MemberRow | null>(null);
  const [checked, setChecked] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Roster lookup across the user's spaces: members/:userId is public,
      // privacy-aware — only fields also present in the member list.
      const spaces = await api<{ spaces: { groupId: string }[] }>("/api/spaces");
      if (!spaces.ok) {
        setChecked(1);
        return;
      }
      for (const space of spaces.data.spaces.slice(0, 25)) {
        const roster = await api<{ members: MemberRow[] }>(`/api/spaces/${space.groupId}/members`);
        if (!roster.ok) continue;
        const found = roster.data.members.find((row) => row.userId === userId);
        if (found) {
          setMember(found);
          break;
        }
      }
      setChecked(1);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <main className="mx-auto max-w-xl px-4 py-14">
      {member ? (
        <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-indigo-600 text-xl font-bold text-white">
              {(member.name || member.username).slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{member.name || member.username}</h1>
              <p className="font-mono text-[13px] text-slate-500">@{member.username}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-1.5 text-[13px] text-slate-600 dark:text-slate-300">
            <div>Vai trò trong nhóm: <strong>{member.role}</strong></div>
            <div>Tham gia: {member.joinedAt}</div>
          </dl>
          <p className="mt-4 text-[12px] text-slate-400">
            Chi tiết công khai khác (bio, ảnh) xem trên hồ sơ ChatIndex.
          </p>
        </div>
      ) : checked === 0 ? (
        <p className="text-[13px] text-slate-400">Đang hồ sơ thành viên…</p>
      ) : (
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Không hiển thị thông tin</h1>
          <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
            Thành viên này không thuộc bất kỳ không gian nào bạn đang tham gia.
          </p>
          <Link to="/" className="mt-4 inline-block font-semibold text-indigo-600 dark:text-indigo-400">Về trang chính</Link>
        </div>
      )}
    </main>
  );
}
