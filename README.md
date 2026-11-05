# ChatSpace

Lớp Group Space trên hạ tầng ChatIndex (spec `ChatIS/ChatSpace/PROJECT_SPEC_2.md`).

- **Frontend**: SPA React Router 8 + Tailwind 4 (repo này), deploy Cloudflare Pages (`chatspace`).
- **Backend**: dùng chung worker `chatindex` (`/api/spaces*`, cookie phiên SameSite=None + HttpOnly; CORS theo `CHATSPACE_ORIGIN`).

## Chạy local

```
npm install
npm run dev        # http://localhost:5173
```

`public/api-config.js` trỏ `window.CHATSPACE_CONFIG.api` tới worker; đổi tại đây nếu backend đổi domain.

## Typecheck / test

```
npm run typecheck
npm run test:e2e   # smoke live API (cần biến môi trường QA_GATE_KEY nếu Turnstile bật)
```

## Deploy

```
npm run deploy
# hoặc thủ công:
npm run build
wrangler pages deploy build/client --project-name chatspace
```

Sau khi đổi domain Pages phải cập nhật biến `CHATSPACE_ORIGIN` trên worker `chatindex` (CORS + trustedOrigins) và deploy lại worker.

## Cấu trúc

- `app/routes/home.tsx` — danh sách không gian, tạo/join.
- `app/routes/groups.$groupId.tsx` — trang nhóm: chat realtime (WS), thành viên, duyệt yêu cầu, Owner settings.
- `app/routes/members.$userId.tsx` — hồ sơ riêng tư-aware.
- `app/routes/control.tsx` — tài khoản, transfer quyền, xoá nhóm, đăng xuất.
- Theme Light/Dark/System lưu `localStorage chatspace:theme`.
