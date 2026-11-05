import { startTransition, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import App from "./root";
import Home from "./routes/home";
import SignIn from "./routes/sign-in";
import SignUp from "./routes/sign-up";
import GroupPage from "./routes/groups.$groupId";
import MemberPage from "./routes/members.$userId";
import Control from "./routes/control";

// GH Pages host dưới /ChatSpace/ (basename bởi basename config) — workers dùng "/".
const basename =
  typeof process !== "undefined" && process.env?.CHATSPACE_BASE
    ? process.env.CHATSPACE_BASE
    : "/";


const router = createBrowserRouter(
  [
    {
      element: <App />,
      children: [
        { index: true, element: <Home /> },
        { path: "sign-in", element: <SignIn /> },
        { path: "sign-up", element: <SignUp /> },
        { path: "groups/:groupId", element: <GroupPage /> },
        { path: "members/:userId", element: <MemberPage /> },
        { path: "control", element: <Control /> },
      ],
    },
  ],
  { basename },
);

startTransition(() => {
  createRoot(document.body).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
