import http from "node:http";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "vite";
import { handleApi } from "../server/api.js";
mkdirSync(".local", { recursive: true });
const db = new DatabaseSync(".local/campus.sqlite");
db.exec(
  "PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY)",
);
for (const file of readdirSync("drizzle")
  .filter((s) => s.endsWith(".sql"))
  .sort()) {
  if (!db.prepare("SELECT name FROM __migrations WHERE name=?").get(file)) {
    db.exec("BEGIN");
    try {
      db.exec(readFileSync("drizzle/" + file, "utf8"));
      db.prepare("INSERT INTO __migrations VALUES (?)").run(file);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}
function prepare(sql, values = []) {
  const stmt = db.prepare(sql);
  return {
    bind: (...args) => prepare(sql, args),
    first: () => stmt.get(...values) || null,
    all: () => ({ results: stmt.all(...values) }),
    run: () => stmt.run(...values),
  };
}
const DB = {
  prepare,
  batch: async (list) => {
    db.exec("BEGIN");
    try {
      list.forEach((q) => q.run());
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  },
};
const port = Number(process.env.PORT || 5173);
const vite = await createServer({
  server: { middlewareMode: true, hmr: { port: port + 1 } },
  appType: "spa",
});
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/api/")) return vite.middlewares(req, res);
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request("http://" + req.headers.host + req.url, {
      method: req.method,
      headers: req.headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const result = await handleApi(request, {
      DB,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    });
    const headers = Object.fromEntries(result.headers);
    if (result.headers.has("set-cookie")) headers["set-cookie"] = result.headers.getSetCookie();
    res.writeHead(result.status, headers);
    res.end(await result.text());
  } catch {
    res.writeHead(500);
    res.end();
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log("Cyberlime: http://localhost:" + port),
);
