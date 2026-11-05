import type { Config } from "@react-router/dev/config";

// GH Pages build sets CHATSPACE_BASE=/ChatSpace/; workers deploy giữ "/".
const base = process.env.CHATSPACE_BASE || "/";

export default {
  ssr: false,
  basename: base,
} satisfies Config;
