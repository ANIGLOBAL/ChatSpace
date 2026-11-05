import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const base = process.env.CHATSPACE_BASE || "/";

export default defineConfig({
  base,
  plugins: [
    tailwindcss(),
    reactRouter(),
    cloudflare({
      viteEnvironment: {
        name: "ssr",
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});