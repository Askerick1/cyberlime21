import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  cpSync,
} from "node:fs";
import { join, extname } from "node:path";
import { build } from "esbuild";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
const assets = {};
function walk(dir, prefix = "") {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name),
      url = prefix + "/" + e.name;
    if (e.isDirectory()) walk(p, url);
    else
      assets[url] = [
        types[extname(p)] || "application/octet-stream",
        readFileSync(p).toString("base64"),
      ];
  }
}
walk("dist/client");
mkdirSync("dist/server", { recursive: true });
cpSync("drizzle", "dist/drizzle", { recursive: true });
const code =
  "import {handleApi} from './server/api.js'; const assets=" +
  JSON.stringify(assets) +
  "; export default { async fetch(req,env){const url=new URL(req.url);if(url.pathname.startsWith('/api/'))return handleApi(req,env);const item=assets[url.pathname]||(url.pathname==='/'?assets['/index.html']:null);if(!item)return new Response('Страница не найдена',{status:404});return new Response(Uint8Array.from(atob(item[1]),c=>c.charCodeAt(0)),{headers:{'Content-Type':item[0],'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cross-Origin-Opener-Policy':'same-origin-allow-popups'}})}}";
await build({
  stdin: { contents: code, resolveDir: process.cwd() },
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
});

cpSync("dist/server/index.js", "worker.js");
