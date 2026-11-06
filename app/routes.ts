import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("sign-in", "routes/sign-in.tsx"),
  route("sign-up", "routes/sign-up.tsx"),
  route("groups/:groupId", "routes/groups.$groupId.tsx"),
  route("members/:userId", "routes/members.$userId.tsx"),
  route("control", "routes/control.tsx"),
  route("admin", "routes/admin.tsx"),
] satisfies RouteConfig;
