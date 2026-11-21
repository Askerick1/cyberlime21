import { courseUnlocked, taskUnlocked } from "../shared/academy.js";
import { studyDay } from "../shared/activity.js";
import { taskXP, mistakeCost, hintCost, maxMistakes } from "../shared/rewards.js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { rooms, flagFor } from "../shared/course.js";
const keys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const json = (body, status = 200, values) => {
  const headers = new Headers(values);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { status, headers });
};
const fail = (message, status) => json({ error: message }, status);
const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
const hash = async (value) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
const cookie = (name, value, ttl, url) =>
  name +
  "=" +
  value +
  "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" +
  ttl +
  (url.protocol === "https:" ? "; Secure" : "");
const readCookie = (request, name) =>
  request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + "="))
    ?.slice(name.length + 1) || "";
const stamp = () => Math.floor(Date.now() / 1000);
const githubEnabled = env => Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
async function openSession(db, url, { id, name, picture, email }, headers = new Headers()) {
  const session = token(), ttl = 60 * 60 * 24 * 14;
  await db.batch([
    db.prepare("INSERT INTO users(id,name,google_picture,email) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, google_picture=excluded.google_picture, email=excluded.email")
      .bind(id, name, picture, email),
    db.prepare("INSERT INTO sessions(digest,user_id,expires) VALUES (?,?,?)")
      .bind(await hash(session), id, stamp() + ttl),
    db.prepare("DELETE FROM sessions WHERE expires<=?").bind(stamp()),
  ]);
  headers.append("Set-Cookie", cookie("cl_session", session, ttl, url));
  return headers;
}
async function profile(db, user) {
  const { results } = await db
    .prepare(
      "SELECT room, task, day, xp FROM solves WHERE user_id=? ORDER BY day,room,task",
    )
    .bind(user.id)
    .all();
  const { results: attempts } = await db.prepare(
    "SELECT room, task, mistakes, hints FROM task_attempts WHERE user_id=? AND NOT EXISTS (SELECT 1 FROM solves WHERE solves.user_id=task_attempts.user_id AND solves.room=task_attempts.room AND solves.task=task_attempts.task)",
  ).bind(user.id).all();
  return {
    user: { name: user.name, email: user.email ?? null, picture: user.avatar || user.google_picture || null, googlePicture: user.google_picture || null, provider: user.id.startsWith("github:") ? "GitHub" : "Google" },
    last: user.last_room,
    solves: results,
    attempts,
  };
}
export async function api(req, env) {
  const url = new URL(req.url),
    path = url.pathname,
    db = env.DB;
  if (
    req.method === "POST" &&
    (req.headers.get("origin") !== url.origin ||
      !req.headers.get("content-type")?.startsWith("application/json"))
  )
    return fail("Запрос отклонён. Обновите страницу.", 403);
  if (path === "/api/auth/config" && req.method === "GET")
    return json({ clientId: env.GOOGLE_CLIENT_ID || null, github: githubEnabled(env) });
  if (path === "/api/auth/github/start" && req.method === "POST") {
    if (!githubEnabled(env)) return fail("Вход через GitHub пока недоступен.", 503);
    const state = token(), verifier = token();
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const challenge = btoa(String.fromCharCode(...digest)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await db.batch([
      db.prepare("DELETE FROM challenges WHERE expires<=?").bind(stamp()),
      db.prepare("INSERT INTO challenges(nonce, expires) VALUES (?,?)").bind("github:" + state, stamp() + 600),
    ]);
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: url.origin + "/api/auth/github/callback", state, scope: "read:user user:email", code_challenge: challenge, code_challenge_method: "S256" });
    return json({ authorize: authorize.href }, 200, { "Set-Cookie": cookie("cl_github", state + "." + verifier, 600, url) });
  }
  if (path === "/api/auth/github/callback" && req.method === "GET") {
    const headers = new Headers({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Set-Cookie": cookie("cl_github", "", 0, url) });
    const finish = result => {
      headers.set("Location", "/?github=" + result);
      return new Response(null, { status: 303, headers });
    };
    const [state, verifier] = readCookie(req, "cl_github").split(".");
    const code = url.searchParams.get("code");
    if (!githubEnabled(env) || !state || !verifier || !code || state !== url.searchParams.get("state")) return finish("error");
    const used = await db.prepare("DELETE FROM challenges WHERE nonce=? AND expires>? RETURNING nonce").bind("github:" + state, stamp()).first();
    if (!used) return finish("error");
    try {
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST", redirect: "error", headers: { Accept: "application/json" },
        body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, code_verifier: verifier, redirect_uri: url.origin + "/api/auth/github/callback" }),
      });
      const { access_token: accessToken } = await response.json();
      if (!response.ok || typeof accessToken !== "string" || !accessToken) return finish("error");
      const githubHeaders = { Authorization: "Bearer " + accessToken, Accept: "application/vnd.github+json", "User-Agent": "CyberLime" };
      const account = await fetch("https://api.github.com/user", { headers: githubHeaders, redirect: "error" });
      if (!account.ok) return finish("error");
      const user = await account.json();
      if (!Number.isSafeInteger(user.id) || user.id < 1) return finish("error");
      const emails = await fetch("https://api.github.com/user/emails", { headers: githubHeaders, redirect: "error" });
      const addresses = emails.ok ? await emails.json() : [];
      const email = Array.isArray(addresses) ? addresses.find(address => address.primary && address.verified)?.email : null;
      await openSession(db, url, {
        id: "github:" + user.id,
        name: String(user.name || user.login || "Аналитик").slice(0, 80),
        picture: typeof user.avatar_url === "string" && user.avatar_url.startsWith("https://avatars.githubusercontent.com/") ? user.avatar_url : null,
        email: typeof email === "string" ? email : null,
      }, headers);
      return finish("ok");
    } catch {
      return finish("error");
    }
  }
  if (path === "/api/auth/challenge" && req.method === "POST") {
    if (!env.GOOGLE_CLIENT_ID)
      return fail("Владелец сайта ещё не подключил Google.", 503);
    const nonce = token();
    await db
      .prepare("DELETE FROM challenges WHERE expires<=?")
      .bind(stamp())
      .run();
    await db
      .prepare("INSERT INTO challenges(nonce, expires) VALUES (?,?)")
      .bind(nonce, stamp() + 600)
      .run();
    return json({ nonce }, 200, {
      "Set-Cookie": cookie("cl_challenge", nonce, 600, url),
    });
  }
  if (path === "/api/auth/google" && req.method === "POST") {
    if (!env.GOOGLE_CLIENT_ID)
      return fail("Регистрация через Google ещё не настроена.", 503);
    const { credential } = await req.json(),
      nonce = readCookie(req, "cl_challenge");
    if (typeof credential !== "string" || !nonce)
      return fail("Начните вход заново.", 401);
    let claims;
    try {
      ({ payload: claims } = await jwtVerify(credential, keys, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: env.GOOGLE_CLIENT_ID,
        algorithms: ["RS256"],
        requiredClaims: ["exp", "sub", "iat", "nonce"],
      }));
    } catch {
      return fail("Google не подтвердил вход. Попробуйте ещё раз.", 401);
    }
    if (claims.nonce !== nonce || typeof claims.sub !== "string" || !claims.sub)
      return fail("Подтверждение входа устарело.", 401);
    const used = await db
      .prepare(
        "DELETE FROM challenges WHERE nonce=? AND expires>? RETURNING nonce",
      )
      .bind(nonce, stamp())
      .first();
    if (!used) return fail("Окно входа устарело. Откройте его снова.", 401);
    const headers = await openSession(db, url, {
      id: claims.sub, name: String(claims.name || "Аналитик").slice(0, 80),
      picture: typeof claims.picture === "string" && /^https:\/\//.test(claims.picture) ? claims.picture.slice(0, 2048) : null,
      email: claims.email_verified === true && typeof claims.email === "string" ? claims.email : null,
    });
    return json({ ok: true }, 200, headers);
  }
  const sid = readCookie(req, "cl_session");
  const digest = sid ? await hash(sid) : "";
  const user = sid
    ? await db
        .prepare(
          "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.digest=? AND s.expires>?",
        )
        .bind(digest, stamp())
        .first()
    : null;
  if (path === "/api/me" && req.method === "GET")
    return json(user ? await profile(db, user) : { user: null });
  if (path === "/api/logout" && req.method === "POST") {
    if (sid)
      await db
        .prepare("DELETE FROM sessions WHERE digest=?")
        .bind(digest)
        .run();
    return json({ ok: true }, 200, {
      "Set-Cookie": cookie("cl_session", "", 0, url),
    });
  }
  if (path === "/api/profile/avatar" && req.method === "POST") {
    if (!user) return fail("Сессия завершилась. Войдите снова.", 401);
    if (Number(req.headers.get("content-length")) > 400000) return fail("Фото слишком большое. Выберите другой файл.", 413);
    const { avatar } = await req.json();
    if (avatar !== null && (typeof avatar !== "string" || avatar.length > 350000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar)))
      return fail("Не удалось сохранить фото. Выберите изображение JPEG, PNG или WebP.", 422);
    await db.prepare("UPDATE users SET avatar=? WHERE id=?").bind(avatar, user.id).run();
    return json(await profile(db, { ...user, avatar }));
  }
  if (path === "/api/profile/delete" && req.method === "POST") {
    if (!user) return fail("Сессия завершилась. Войдите снова.", 401);
    const { confirmation } = await req.json();
    if (confirmation !== "DELETE") return fail("Подтвердите удаление аккаунта.", 422);
    await db.batch([
      db.prepare("DELETE FROM solves WHERE user_id=?").bind(user.id),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id),
      db.prepare("DELETE FROM users WHERE id=?").bind(user.id),
    ]);
    return json({ ok: true }, 200, { "Set-Cookie": cookie("cl_session", "", 0, url) });
  }
  if (["/api/solve", "/api/hint", "/api/visit"].includes(path) && req.method === "POST") {
    if (!user) return fail("Сессия завершилась. Войдите снова.", 401);
    const { room, task, answer, timeZone, hint } = await req.json();
    const target = rooms.find((r) => r.id === room);
    if (!target)
      return fail("Комната не найдена.", 404);
    if (path !== "/api/visit") {
      const lesson = Number.isInteger(task) ? target.lessons[task] : undefined;
      if (!lesson) return fail("Задание не найдено.", 404);
      const current = await profile(db, user);
      if (target.mode === "course" && !courseUnlocked(room, current.solves)) return fail("Сначала завершите предыдущий модуль.", 409);
      if (!taskUnlocked(target, task, current.solves)) return fail("Сначала завершите предыдущий этап.", 409);
      if (current.solves.some(s => s.room === room && s.task === task)) return json(current);
      if (path === "/api/hint") {
        if (!Number.isInteger(hint) || hint < 1 || hint > (lesson.hints?.length || 1))
          return fail("Подсказка недоступна.", 422);
        await db.prepare(
          `INSERT INTO task_attempts(user_id,room,task,hints)
           SELECT ?,?,?,? WHERE ? <= COALESCE((SELECT hints FROM task_attempts WHERE user_id=? AND room=? AND task=?),0)+1
           ON CONFLICT DO UPDATE SET hints=max(task_attempts.hints,excluded.hints)`,
        ).bind(user.id, room, task, hint, hint, user.id, room, task).run();
        return json(await profile(db, user));
      }
      if (typeof answer !== "string" || !answer.trim()) return fail("Введите ответ.", 422);
      if (flagFor(room, task) !== answer.trim()) {
        await db.prepare(
          `INSERT INTO task_attempts(user_id,room,task,mistakes) VALUES (?,?,?,1)
           ON CONFLICT DO UPDATE SET mistakes=min(task_attempts.mistakes+1,?)`,
        ).bind(user.id, room, task, maxMistakes).run();
        return json({ error: "Ответ не принят.", profile: await profile(db, user) }, 422);
      }
      await db
        .prepare(
          `INSERT INTO solves(user_id,room,task,day,xp)
           VALUES (?,?,?,?,? - COALESCE((SELECT mistakes * ? + hints * ? FROM task_attempts WHERE user_id=? AND room=? AND task=?),0))
           ON CONFLICT DO NOTHING`,
        )
        .bind(
          user.id,
          room,
          task,
          studyDay(new Date(), typeof timeZone === "string" ? timeZone : "UTC"),
          taskXP, mistakeCost, hintCost, user.id, room, task,
        )
        .run();
    }
    await db
      .prepare("UPDATE users SET last_room=? WHERE id=?")
      .bind(room, user.id)
      .run();
    return json(await profile(db, { ...user, last_room: room }));
  }
  return fail("Страница не найдена.", 404);
}
export async function handleApi(request, env) {
  try {
    return await api(request, env);
  } catch (error) {
    console.error("API request failed", error.name);
    return fail("Не удалось выполнить запрос. Попробуйте ещё раз.", 500);
  }
}
