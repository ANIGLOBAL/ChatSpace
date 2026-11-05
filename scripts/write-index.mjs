/**
 * Ghép index.html SPA cho build/client (rr8 SPA + cloudflare plugin prerender
 * bị 404 khi basename="/"). Đọc hash asset xuất hiện sau `react-router build`
 * rồi ghi index.html tương ứng — chạy sau mỗi build. Asset URLs có prefix theo
 * CHATSPACE_BASE (ví dụ /ChatSpace/ trên GitHub Pages).
 */
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const base = (process.env.CHATSPACE_BASE || "/").replace(/\/?$/, "/");
const root = join(process.cwd(), "build", "client");
if (!existsSync(root)) {
  console.error("build/client not found — run `npm run build` first.");
  process.exit(1);
}
const assets = readdirSync(join(root, "assets"));
const pick = (needle) => {
  const found = assets.find((name) => name.includes(needle));
  if (!found) {
    console.error(`missing asset for ${needle}`);
    process.exit(1);
  }
  return found;
};
const css = assets.find((name) => name.endsWith(".css") && name.startsWith("app-"));
const manifest = pick("manifest-");
const entry = pick("entry.client-");
const apiBlock = pick("api-");
if (!css) {
  console.error("missing css asset");
  process.exit(1);
}

const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ChatSpace</title>
    <link rel="icon" type="image/svg+xml" href="${base}favicon.svg" />
    <script>
      (function(){try{var raw=localStorage.getItem("chatspace:theme")||"system";var dark=raw==="dark"||(raw==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)document.documentElement.classList.add("dark");}catch(e){}})();
    </script>
    <script src="${base}api-config.js"></script>
    <link rel="stylesheet" href="${base}assets/${css}" />
    <script type="module" src="${base}assets/${manifest}"></script>
    <script type="module" src="${base}assets/${apiBlock}"></script>
  </head>
  <body>
    <script type="module" src="${base}assets/${entry}"></script>
  </body>
</html>
`;
writeFileSync(join(root, "index.html"), html, "utf8");
console.log(`index.html written (base=${base}, entry=${entry}, manifest=${manifest}, css=${css}, lib=${apiBlock})`);
