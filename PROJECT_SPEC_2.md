# ChatSpace — PROJECT_SPEC_2.md

**Document type:** Product / Frontend / Backend Integration Specification  
**Version:** 1.0  
**Status:** Working specification  
**Product name:** ChatSpace  
**Repository:** Separate repository from ChatIndex  
**Backend:** Reuses the existing ChatIndex backend and infrastructure  
**Firebase:** Not used

> This document specifies ChatSpace's implementation requirements and its integration with ChatIndex. The product rationale and broader positioning will be explained separately by the project owner to the coding agent. Do not infer a different product concept or replace these requirements with a generic Discord clone.

---

# 1. Project Boundary

## 1.1. Separate product repository

ChatSpace must have its own repository, frontend source code, build process, deployment configuration, and documentation.

ChatSpace is not a folder or route inside the ChatIndex frontend. It is a separately deployed web application with its own interface and routes.

## 1.2. Shared backend

ChatSpace reuses the existing ChatIndex backend and shared services:

- Cloudflare Workers for API, authentication, authorization, and business logic.
- Cloudflare D1 for account data and application/business metadata.
- Cloudflare Durable Objects for realtime connections and per-Group-Space SQLite message storage.
- Backblaze B2 for binary files and images.
- Existing account, session, security, subscription, and storage services where supported by the shared backend.

Do not create a second independent account system, a second D1 database, a second B2 bucket, or an unrelated backend solely for ChatSpace.

If a required API is missing from the shared backend, document the missing endpoint/contract and implement the necessary backend extension in the existing ChatIndex backend project when that source is available. Do not silently create a parallel backend with duplicated data.

## 1.3. No Firebase

Firebase Authentication, Firestore, Firebase Storage, and Firebase Realtime Database are not part of ChatSpace.

Do not add Firebase dependencies or generate Firebase configuration files.

## 1.4. Do not modify unrelated ChatIndex behavior

ChatSpace must not break the existing ChatIndex product, its DM feature, its ordinary Group Chat feature, or shared account behavior.

Changes to shared backend schemas or APIs must be backward-compatible where possible. Migrations must not delete or rewrite unrelated ChatIndex data.

---

# 2. Production Web Application and Deployment

## 2.1. Production requirement

ChatSpace must be deployed as a real, publicly accessible web application on its configured production domain.

A user must be able to open the production URL in a browser and use ChatSpace without cloning a repository, installing packages, opening a terminal, or running a local server.

GitHub is the source-code repository, not the user-facing production website.

The frontend may be compiled into HTML/CSS/JavaScript assets as part of the build, but the delivered product must connect to the live shared backend and must not be a GitHub-Pages-only static mockup.

## 2.2. Hosting

Use Cloudflare hosting compatible with the existing backend and deployment setup. The implementation may use Cloudflare Pages or Workers Static Assets, depending on the current ChatIndex infrastructure. Choose one coherent production approach and document it.

Requirements:

- Production frontend is served from a real web origin/domain.
- HTTPS is enabled.
- SPA routing supports direct navigation and refresh on nested routes.
- API calls connect to the shared ChatIndex Workers backend.
- Production secrets are configured through Cloudflare secrets/environment configuration, never committed to Git.
- Development and production environments are separated.
- A deployment guide explains required account permissions, bindings, variables, secrets, and commands.

Do not deploy ChatSpace to GitHub Pages as its only hosting target.

## 2.3. Repository contents

The repository must contain at least:

- Frontend source code.
- Build configuration.
- Cloudflare deployment configuration appropriate to the selected hosting method.
- `.env.example` or equivalent non-secret configuration template.
- `README.md` with setup, development, build, and production deployment instructions.
- Tests for important route guards and user flows.

Never commit real passwords, API tokens, B2 application keys, Worker secrets, or production session secrets.

---

# 3. Routes and Identity

The route names below are exact and must not be changed to singular forms.

| Route | Purpose | Access |
|---|---|---|
| `/groups/<group_id>` | Group Space page | Authenticated user; membership required for chat access |
| `/members/<user_id>` | Member profile page | Public/member-visible fields only, according to privacy settings |
| `/control` | ChatSpace administration panel | Authorized system Admin only |

The frontend router and hosting fallback must support direct loading and refreshing of all these routes.

## 3.1. Group ID

- Every Group Space receives a unique, randomly generated, URL-safe ID.
- The ID is the permanent identifier of the Group Space.
- The ID is used in the `/groups/<group_id>` route and in the join-by-code flow.
- Do not create a separate invite token as the normal joining mechanism.
- The ID must be sufficiently unpredictable to resist enumeration.
- The ID must be unique and immutable after creation.
- A Group Space display name is not an identifier.

## 3.2. Group display name

- Every Group Space has a display name.
- Duplicate display names are allowed.
- Do not add a unique database constraint to the display name.
- Changing the display name must not change the Group ID or route.
- Search and administration interfaces should distinguish groups by display name plus Group ID/Owner when needed.

## 3.3. Member ID

`<user_id>` is the shared ChatIndex user identifier. It must not be a second ChatSpace-specific account ID.

---

# 4. Shared Account and Authentication

ChatSpace uses the existing ChatIndex identity and authentication system.

## 4.1. Shared identity

- A user has one account across ChatIndex and ChatSpace.
- The same User ID is used in both products.
- Do not create a separate ChatSpace password or account record.
- Do not duplicate user credentials in the ChatSpace frontend or its own database.

## 4.2. Authentication requirements

Use the shared backend's email/password authentication:

- Register and sign in with email and password.
- Email verification is not mandatory for initial registration, following the existing ChatIndex decision.
- Passwords are stored only as secure password hashes by the backend; never in plaintext.
- Authenticator-based TOTP 2FA is supported when enabled on the account.
- Existing sessions and logout/revocation behavior are shared with ChatIndex.
- ChatSpace must provide sign-in, sign-out, and session-expired states.
- After login, return the user to the intended Group Space route when appropriate.
- If 2FA is enabled, complete the second-factor challenge before granting an authenticated session.

Do not implement a second authentication implementation inside the ChatSpace frontend.

## 4.3. Unauthorized access

- A signed-out user cannot view private Group Space content.
- A user who is not a member cannot read messages, files, or private group details.
- Knowing or guessing a Group ID does not grant membership.
- Every protected API operation must be authorized by the backend, not only by frontend route guards.

---

# 5. Group Space Creation Policy

## 5.1. One Group Space per account

Each user account may own at most one Group Space at a time.

- A user who does not currently own a Group Space may create one, subject to the global Admin setting.
- A user who already owns an active Group Space cannot create another one.
- The initial creator becomes the Owner and is added as a member automatically.
- The one-Group-Space limit applies to ownership, not ordinary membership. A user may join other users' Group Spaces if eligible.
- Group display names may be duplicated across different Group Spaces.

## 5.2. Global Admin switch

The `/control` panel must contain a global setting named `Group Space Creation` or an equivalent clear label.

Setting: `group_space_creation_enabled`.

When ON:

- Eligible users who do not currently own a Group Space can create one.
- The one-owned-Group-Space-per-account rule still applies.

When OFF:

- No user can create a new Group Space.
- The frontend must clearly show that creation is unavailable.
- The backend must reject creation requests even if a client bypasses the UI.
- Existing Group Spaces continue operating normally.
- Existing membership, chat, settings, and join flows are not automatically disabled.

This switch controls creation only. It must not be treated as a global shutdown of existing groups.

## 5.3. Owner voluntarily deletes a Group Space

If the Owner intentionally deletes their Group Space and deletion is completed:

- The old Group Space is no longer active or accessible.
- Its Group ID must not be reassigned to a different group.
- The account's ownership slot is released.
- The Owner may create a replacement Group Space if the global creation switch is ON and the account is otherwise eligible.

Deletion must require a clear confirmation step.

## 5.4. Admin-suspended Group Space

If an Admin suspends a Group Space:

- The Group Space becomes inaccessible for normal chat operations according to the suspension policy.
- The Owner cannot create a replacement Group Space while that owned Group Space remains suspended.
- The ownership slot remains occupied during suspension.
- Re-enabling global creation does not override the suspension.
- When the suspension is lifted, the original Group Space may resume according to Admin action.

Do not treat suspension as voluntary deletion.

---

# 6. Joining a Group Space by Group ID

## 6.1. Join flow

There is no separate shareable invite-link token as the standard joining flow.

The Group ID itself is the identifier used to find and request access to a Group Space.

Expected flow:

1. The user signs in to ChatSpace.
2. The user chooses `Join Group` or the equivalent action.
3. The user enters the Group ID.
4. The frontend navigates to or resolves `/groups/<group_id>`.
5. The backend checks that the Group Space exists and is not suspended/deleted.
6. The backend checks whether the user is already a member or has a pending request.
7. The backend applies the Group Space's approval setting.

Opening `/groups/<group_id>` directly must not bypass membership checks. The route identifies the Group Space; it is not, by itself, proof of membership.

## 6.2. Direct join when approval is OFF

If `require_owner_approval` is OFF:

- An authenticated eligible user can join immediately after the backend validates the Group ID and group status.
- The backend creates the membership record exactly once.
- The Group Space appears in the user's ChatSpace group list.
- The user can connect to the Group Space's realtime room and read messages according to membership permissions.

## 6.3. Approval flow when approval is ON

If `require_owner_approval` is ON:

- Submitting the Group ID creates a join request with `Pending` status.
- The applicant is not yet a member.
- A pending applicant cannot read group messages, member-only details, or private files.
- A duplicate pending request must not create duplicate request records.
- The applicant sees a clear pending state.
- Only after approval is the membership created and access granted.

## 6.4. Owner approval interface

Provide a recognizable button with a person-and-check icon (for example, `user-round-check`).

The button opens a popup/panel showing pending join requests.

Each request should display enough information to identify the applicant, such as avatar, display name, username, and User ID, subject to profile visibility rules.

Each request has two actions:

- Check mark: approve.
- X mark: reject.

On approval:

- The backend atomically marks the request approved and creates the membership.
- The new member can then enter the Group Space.
- The group member count updates.
- The applicant receives an in-app result/notification where supported.

On rejection:

- The request is marked rejected.
- No membership is created.
- The applicant does not gain access to group content.

The Owner is the required approver for the initial implementation. Do not silently grant approval authority to system Admins or ordinary members. Group Admin approval can be added later as an explicit permission if requested.

## 6.5. Request states

Use explicit states such as:

- `pending`
- `approved`
- `rejected`
- `cancelled` (if the applicant can cancel)

State transitions must be validated by the backend. An already processed request cannot be approved or rejected a second time.

---

# 7. Group Space Roles and Owner Controls

Each Group Space has roles:

- Owner
- Admin
- Member

There is exactly one Owner at a time. A Group Space may have multiple Admins and Members.

## 7.1. Owner

The Owner can:

- Edit Group Space display name, avatar, description, and supported appearance settings.
- Enable or disable Owner approval for new members.
- Review and approve/reject pending join requests.
- Manage members and group Admin assignments according to the role policy.
- Transfer ownership.
- Delete the Group Space.
- View and manage the Group Key according to the shared ChatIndex key policy, if that policy is implemented for this group type.

## 7.2. Group Admin

Group Admin permissions should be limited to member/group-management capabilities explicitly assigned by the Owner.

A Group Admin must not automatically receive access to the plaintext Group Key. The existing ChatIndex decision is that the Owner controls and can view the Group Key, while group Admins cannot view it.

## 7.3. Member

Members can use the Group Space's permitted chat and file features, view member-visible group information, and leave the group.

Members cannot create another Group Space on behalf of this group or change Owner-only settings.

## 7.4. Ownership transfer

When ownership is transferred:

- The new Owner receives Owner permissions.
- The previous Owner loses Owner-only permissions and becomes a normal member or another explicitly selected role.
- The existing Group ID does not change.
- Group members and messages remain associated with the same Group Space.
- If a Group Key exists, transfer the existing Group Key management entitlement to the new Owner; do not silently replace the key solely because ownership changed.
- Write an audit event for the ownership transfer.

---

# 8. Group Space Interface and Customization

ChatSpace must have a purpose-built interface, visually distinct from the ChatIndex main frontend.

The design may learn from the usability strengths of Zalo, Telegram, and Discord group chat, but must not copy their branding, exact layouts, icons, or proprietary assets.

## 8.1. Appearance modes

- Provide Light Mode and Dark Mode.
- Users can choose their preferred mode in Settings.
- Support a system-default option if straightforward.
- Save the preference to the shared user profile/settings service when available, otherwise use an appropriate local preference with a future migration path.
- Maintain accessible contrast in both modes.

## 8.2. Responsive design

- Desktop and mobile browser layouts are required.
- Mobile navigation must be touch-friendly.
- Group navigation, chat, member list, settings, and popups must adapt to narrow screens.
- Avoid desktop-only interactions.

## 8.3. Group identity customization

Provide practical Owner-controlled customization, such as:

- Group display name.
- Group avatar.
- Group description.
- Optional cover/banner.
- Accent color or theme preset.
- Supported chat appearance options.

Display names are not unique. Do not use the display name as a primary key, URL ID, or authorization token.

The UI should provide attractive defaults. Do not build a complex freeform page builder unless separately requested.

## 8.4. General UX principles

- Clear navigation and group identity.
- Readable chat content and obvious message composer.
- Fast access to member list and group settings.
- Clear pending-join and permission-denied states.
- Simple, consistent interaction patterns.
- Avoid unnecessary features that make group usage cumbersome.

---

# 9. Realtime and Message Storage Integration

## 9.1. Reuse the existing ChatIndex backend

ChatSpace must use the shared ChatIndex realtime and persistence architecture.

- Cloudflare Workers: API, authentication, authorization, and validation.
- Durable Objects: WebSocket/realtime handling and room coordination.
- SQLite inside the appropriate Durable Object: persistent messages and conversation-local state.
- D1: Group Space metadata, membership, join requests, settings, account references, and shared business data.
- Backblaze B2: actual binary files and images.

Do not store every chat message in D1 if the shared ChatIndex architecture has moved message storage to SQLite in Durable Objects.

## 9.2. One realtime room per Group Space

Each Group Space must map to a stable Durable Object identity/room.

The room stores its message history and conversation-local state in its own SQLite database. Reuse the existing ConversationRoomDO implementation where possible; do not create a second competing realtime system without a documented technical reason.

The Group Space's metadata and access control remain in the shared backend/D1.

## 9.3. Authorization

Before granting a WebSocket connection or message operation, the backend/DO must validate:

- The user's authenticated session.
- The Group Space exists and is active.
- The Group Space is not suspended.
- The user is an active member.
- The requested operation is allowed for the user's role.

A removed or departed member must not continue receiving new realtime events or fetching messages through the backend.

## 9.4. Message persistence

- Persist a message before broadcasting its successful-send event.
- Use stable unique message IDs and idempotency protection to prevent duplicate messages after retries.
- Paginate message history; do not load the entire history on every entry.
- Keep ordering deterministic.
- Use server-validated timestamps.
- Handle disconnected clients and reconnects without duplicating messages.

---

# 10. Existing Chat Reset Policies

The shared ChatIndex chat-retention policies also apply to ChatSpace Group Space conversations unless the project owner explicitly changes them later.

## 10.1. Monthly reset

- Reset conversation message history according to the shared monthly schedule.
- Preserve the Group Space itself, its ID, members, roles, settings, and Group Key.
- Remove the old messages and their references from the active conversation history.
- Files stored in B2 and retained in the owner's Personal Storage remain in storage unless separately deleted under the file-retention policy.
- Notify active realtime connections that the history has been reset.

The exact monthly execution time/timezone remains a deployment/configuration decision unless already fixed in the shared backend.

## 10.2. 100 MB message-content reset

If the conversation's stored message-content size exceeds 100 MB, reset that conversation immediately rather than waiting for the monthly reset.

- The threshold applies per Group Space conversation.
- Count message content only.
- Do not count B2 image/file binary size toward the 100 MB threshold.
- Do not delete B2 objects simply because the conversation resets.
- Do not remove the Group Space, its members, roles, configuration, or Group Key.
- Reset the conversation's message-size counter after the reset completes.

Use a deterministic byte-counting method in the backend and protect against concurrent sends crossing the threshold without triggering a reset.

---

# 11. Files and Personal Storage

ChatSpace reuses the shared ChatIndex file service and Backblaze B2 bucket.

- Binary files are stored in B2.
- D1 stores file metadata, ownership, size, object references, and lifecycle status.
- Messages reference files through stable file IDs/metadata, not embedded binary content.
- Group members can access only files they are authorized to access.
- Deleting a file through the shared file manager must invalidate its references according to the shared deletion policy.
- A message reset removes the message's active file references from chat history but does not delete a file that remains in Personal Storage.
- Do not duplicate the B2 bucket or create a separate ChatSpace file quota system.

Use configured secrets for B2 credentials. Never place B2 application keys or other secrets in source code, frontend bundles, Markdown committed to the repository, or browser storage.

---

# 12. ChatSpace Control Panel

Route: `/control`.

Only an authenticated system Admin with server-verified Admin authorization may access the Control Panel.

The UI hiding the route is not sufficient; every Admin API must independently authorize the request.

## 12.1. Dashboard

Show relevant operational summaries where data is available:

- Total Group Spaces.
- Active and suspended Group Spaces.
- Total members across Group Spaces.
- Pending join requests if useful to Admin operations.
- Group creation setting status.
- Storage usage summaries from the shared file service.
- Recent administrative actions.

Do not fabricate statistics when source data is unavailable.

## 12.2. Group Space management

Admin can:

- Search/list Group Spaces.
- View Group ID, display name, Owner, status, and creation time.
- View membership counts and relevant metadata.
- Suspend and unsuspend a Group Space.
- Remove a Group Space when authorized by the platform policy.
- Review reports related to a Group Space.
- Inspect operational metadata without exposing the plaintext Group Key.

Suspension must preserve the ownership slot so the Owner cannot create a replacement while the suspension remains active.

## 12.3. Global group creation switch

Admin can turn `group_space_creation_enabled` ON or OFF.

The setting is persisted in the shared backend/D1 and checked server-side on every creation request.

## 12.4. Account and membership administration

Provide relevant account/member lookup and moderation tools consistent with the shared ChatIndex Admin permissions.

Do not create a separate ChatSpace identity or user database.

## 12.5. Reports and audit logs

- Show submitted reports and their processing states where the shared service supports them.
- Record important Admin actions, including actor, action, target, timestamp, and reason where applicable.
- Audit logs must not contain passwords, raw session tokens, or secret keys.

## 12.6. Subscription and storage administration

Reuse the shared ChatIndex subscription and storage administration services where those capabilities are available.

Do not create a second subscription ledger, duplicate payment records, or independent quotas for ChatSpace.

---

# 13. Shared Plans and Entitlements

ChatSpace uses the existing ChatIndex account plan and entitlements. Do not invent separate ChatSpace subscription tiers.

Current shared plan values:

| Plan | Monthly | Annual | Total storage quota | Maximum image size |
|---|---:|---:|---:|---:|
| Free | 0 VND | 0 VND | 500 MB | 20 MB |
| Low Budget | 10,000 VND | 100,000 VND | 1 GB | 30 MB |
| Premium | 32,000 VND | 320,000 VND | 5 GB | 40 MB |

The annual amount is priced as 10 months of the monthly rate.

The core ability to use ChatSpace must not be silently paywalled by the frontend. Any plan-based restriction must come from shared backend entitlements and the already agreed ChatIndex policy.

---

# 14. Shared Infrastructure References

Use the existing ChatIndex resources where applicable.

| Resource | Existing identifier |
|---|---|
| Cloudflare D1 database | `e5b93c21-46d7-49f4-ab0a-1e446b0267fa` |
| Backblaze B2 bucket | `774cf5aeef3d8829a11d0f16` |

Do not create another D1 database or B2 bucket unless the project owner explicitly approves it.

B2 credentials must be supplied through secure runtime configuration/Cloudflare secrets. Never place the actual application key in this document or in the repository.

No Firebase resource is required.

---

# 15. Data Model Requirements

The exact SQL schema must be inspected and coordinated with the existing ChatIndex backend before implementation. Do not assume a fresh database or overwrite existing tables.

At minimum, the shared backend must represent the following ChatSpace concepts. Table names are suggestions; adapt to existing naming conventions while preserving these constraints.

## 15.1. Group Space record

Suggested fields:

- `group_id` — immutable unique identifier used by `/groups/<group_id>`.
- `owner_user_id` — shared ChatIndex User ID.
- `display_name` — non-unique display value.
- `description`.
- `avatar_file_id` and optional `cover_file_id`.
- Appearance/theme settings.
- `status` — active, suspended, deleted, or equivalent lifecycle states.
- `require_owner_approval` — boolean.
- `created_at` and `updated_at`.
- Reference/identity for the associated Durable Object room.

Do not apply a unique constraint to `display_name`.

## 15.2. Group membership

Suggested fields:

- `group_id`.
- `user_id`.
- `role` — owner, admin, member.
- `membership_status` — active or removed/left as appropriate.
- `joined_at`.

Enforce one active membership per `(group_id, user_id)`.

Enforce exactly one active Owner per Group Space through safe backend logic/constraints.

## 15.3. Join requests

Suggested fields:

- `request_id`.
- `group_id`.
- `applicant_user_id`.
- `status` — pending, approved, rejected, cancelled.
- `created_at` and `processed_at`.
- `processed_by_user_id`.

Prevent duplicate pending requests for the same user and Group Space.

Only the Owner can approve/reject in the initial version.

## 15.4. System settings

Persist the global Group Space creation switch in the shared backend. Do not keep it only in browser local storage or frontend configuration.

## 15.5. Audit events

Record sensitive administrative actions and ownership transfers with actor, action, target, timestamp, and optional reason.

---

# 16. API and Backend Integration Requirements

Before building UI behavior, inspect the existing ChatIndex API, authentication flow, D1 schema, Durable Object bindings, and file service.

Create or update an integration contract for at least:

- Current authenticated user/profile.
- Sign-in/sign-out/session validation using shared auth.
- List a user's Group Spaces.
- Create a Group Space.
- Get Group Space metadata by Group ID.
- Update Group Space display name and customization settings.
- Request to join by Group ID.
- Approve/reject join requests.
- Leave a Group Space.
- Transfer ownership.
- Manage group roles/members.
- Connect to the Group Space realtime room.
- Upload/resolve group files through the shared B2 file service.
- Read/write the global creation setting (Admin only).
- Search/manage Group Spaces (Admin only).
- Suspend/unsuspend a Group Space (Admin only).
- Read audit logs (Admin only).

For every endpoint/documented action, define:

- HTTP method and route or realtime message type.
- Request and response shape.
- Authentication requirement.
- Authorization rule.
- Validation and error responses.
- Idempotency requirements where retries may occur.

Do not invent frontend-only success states. The UI must reflect the actual backend result.

---

# 17. Security Requirements

- Use shared ChatIndex sessions and identity.
- Enforce all membership and role checks on the backend.
- Do not expose B2 application keys to the browser.
- Do not trust Group ID as proof of membership.
- Use unpredictable Group IDs to reduce enumeration.
- Rate-limit join attempts and account/group creation endpoints.
- Prevent duplicate group creation under concurrent requests using transactional/atomic backend logic.
- Prevent duplicate pending join requests.
- Verify Owner authority for approval, ownership transfer, group deletion, and Owner-only settings.
- Verify system Admin role server-side for `/control` APIs.
- Apply CSRF protection where cookie-authenticated state-changing requests require it.
- Apply secure CORS rules for the ChatSpace production origin.
- Validate uploaded file size/type on the backend.
- Keep all secrets in secure runtime configuration.
- Record important privileged actions in audit logs.

## 17.1. Group Key visibility

If the shared ChatIndex group-key feature is used for ChatSpace:

- Reuse the shared key-management implementation; do not invent a second incompatible key system.
- The Owner can view/manage the Group Key under the agreed policy.
- Group Admins and system Admins must not be given plaintext Group Key visibility by default.
- Ownership transfer carries the existing Group Key management entitlement to the new Owner; it does not silently replace the key.
- The Group Key is not the same as the Group ID and is not used as the join code.

---

# 18. Error and Empty States

Provide clear UI states for at least:

- User is signed out.
- Session expired.
- Group ID not found.
- Group is suspended.
- Group is deleted/unavailable.
- User is already a member.
- Join request is pending.
- Join request was rejected.
- Owner approval is required.
- User is not authorized to view group content.
- Group creation is disabled globally.
- User already owns a Group Space.
- User's owned Group Space is suspended.
- Network/realtime connection lost and reconnected.
- Upload rejected due to file type/size/quota.

Do not expose private group information in error messages to non-members.

---

# 19. Testing Requirements

At minimum, test:

1. A signed-out user is redirected to login and returned to the requested route after authentication.
2. A signed-in user can create one Group Space when the Admin switch is ON.
3. The same Owner cannot create a second Group Space.
4. Duplicate display names are allowed for different Group IDs.
5. Each Group ID is unique and immutable.
6. Turning the global creation switch OFF blocks new creation at the backend.
7. Existing groups remain usable when creation is OFF.
8. A suspended Owner cannot create a replacement group.
9. Voluntary deletion releases the account's ownership slot after deletion completes.
10. A user can find/request access using the Group ID.
11. Direct join works when approval is OFF.
12. Pending approval works when approval is ON.
13. Only the Owner can approve/reject in the initial implementation.
14. A pending applicant cannot read group chat or private files.
15. Approval creates membership exactly once.
16. Rejection does not create membership.
17. Non-members cannot connect to the realtime room.
18. Admin APIs reject non-Admin users even if they call the endpoint directly.
19. `/groups/<id>`, `/members/<id>`, and `/control` survive direct page refresh on production hosting.
20. Shared ChatIndex authentication and user data are not duplicated.
21. The existing ChatIndex application continues working after shared backend changes.
22. Light/Dark mode works on desktop and mobile.

---

# 20. Definition of Done

ChatSpace is ready for release only when:

- Its separate repository contains the complete frontend source and deployment configuration.
- The production web application is deployed and reachable through its configured domain.
- It does not depend on GitHub Pages as its only hosting target.
- It uses the shared ChatIndex authentication and backend services.
- It does not use Firebase.
- Group creation limits and the Admin switch are enforced on the backend.
- Group IDs and routes follow the exact plural route patterns.
- Duplicate Group Space display names work.
- Join-by-Group-ID and Owner approval work end-to-end.
- Group/member/admin permissions are enforced server-side.
- Realtime messages persist in the shared Durable Object SQLite architecture.
- B2 uploads work without exposing credentials.
- Required tests pass.
- README and deployment instructions are complete.
- No production secrets are committed.

---

# 21. Implementation Guidance for OpenCode

1. Inspect the existing ChatIndex backend before writing code.
2. Confirm the current authentication/session API and reuse it.
3. Confirm the existing D1 database, migrations, DO classes/bindings, SQLite message storage, and B2 file service.
4. Produce a short implementation plan and list any missing backend endpoints before making breaking changes.
5. Build ChatSpace in this separate repository.
6. Add only the required backward-compatible extensions to the existing backend.
7. Do not create duplicate authentication, D1, B2, payment, subscription, or realtime systems.
8. Implement and test Group Space creation policy before UI polish.
9. Implement join-by-Group-ID and Owner approval end-to-end.
10. Build the responsive Light/Dark interface.
11. Deploy the production web frontend to Cloudflare hosting and verify direct navigation/refresh for all required routes.
12. Document any configuration or backend changes that require the project owner's Cloudflare access.

If a required shared-backend capability is unavailable, clearly report the missing component and the exact change required. Do not silently replace the specified architecture with Firebase, GitHub Pages-only hosting, local-only execution, or a second backend.

---

**End of ChatSpace PROJECT_SPEC_2.md**
