import {calendarFormat} from "./i18n";
import { tr, locale, searchable } from "./i18n";
import { useEffect, useRef, useState } from "react";
import { LanguagePicker } from "./StudyControls";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Flag,
  FlaskConical,
  GitBranch,
  Layers3,
  LockKeyhole,
  Medal,
  Route,
  Search,
  ShieldCheck,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  achievements,
  api,
  board,
  complete,
  count,
  go,
  names,
  paths,
  rank,
  rooms,
  themeLabels,
  xp,
  type Profile,
  type ThemeMode,
} from "./data";
import { Card, Heatmap, num } from "./Dashboard";
export function Catalog({ p, initial }: { p: Profile; initial: string }) {
  const [q, query] = useState(initial),
    [cat, category] = useState("Все"),
    [diff, difficulty] = useState("Все"),
    [status, setStatus] = useState("Все");
  const list = rooms.filter((r) => {
    const n = count(p, r.id);
    return (
      (cat === "Все" || r.category === cat) &&
      (diff === "Все" || diff === r.difficulty) &&
      (status === "Все" ||
        (status === "Решённые"
          ? n === r.lessons.length
          : n > 0 && n < r.lessons.length)) &&
      searchable(
        [
          r.title,
          r.description,
          r.category,
          names[r.category],
          r.difficulty,
          names[r.difficulty],
        ],
        q,
      )
    );
  });
  return (
    <>
      <div className="pageTitle">
        <h1>
          {tr("Каталог комнат")}
          <span className="titleDot">.</span>
        </h1>
        <p>{tr("Выберите лабораторию и исследуйте её в своём темпе.")}</p>
      </div>
      <div className="panel filters">
        <div className="filterRow">
          <label className="searchBox">
            <Search size={17} />
            <input
              aria-label={tr("Поиск по комнатам и тегам")}
              placeholder={tr("Название или тег")}
              value={q}
              onChange={(e) => query(e.target.value)}
            />
            {q && (
              <button
                aria-label={tr("Очистить поиск")}
                onClick={() => query("")}
              >
                <X size={15} />
              </button>
            )}
          </label>
          <label>
            {tr("Сложность")}
            <select value={diff} onChange={(e) => difficulty(e.target.value)}>
              {["Все", "Easy", "Medium", "Hard", "Insane"].map((a) => (
                <option key={a} value={a}>
                  {tr(names[a] || a)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {tr("Статус")}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {["Все", "Решённые", "В процессе"].map((a) => (
                <option key={a} value={a}>
                  {tr(a)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="chips">
          {["Все", ...Array.from(new Set(rooms.map((r) => r.category)))].map(
            (c) => (
              <button
                key={c}
                className={cat === c ? "selected" : ""}
                onClick={() => category(c)}
              >
                {tr(names[c] || c)}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="sectionHead">
        <h2>
          {tr("Комнаты ")}
          <small>{list.length}</small>
        </h2>
      </div>
      {list.length ? (
        <div className="cards">
          {list.map((r) => (
            <Card key={r.id} room={r} p={p} />
          ))}
        </div>
      ) : (
        <div className="panel empty">
          <Search />
          <h3>{tr("Комнаты не найдены")}</h3>
          <button
            className="textBtn"
            onClick={() => {
              category("Все");
              difficulty("Все");
              setStatus("Все");
              query("");
            }}
          >
            {tr("Сбросить фильтры")}
          </button>
        </div>
      )}
    </>
  );
}
export function Paths({ p }: { p: Profile }) {
  const [active, select] = useState(0);
  return (
    <>
      <div className="pageTitle">
        <h1>
          {tr("Пути обучения")}
          <span className="titleDot">.</span>
        </h1>
        <p>
          {tr(
            "Последовательные программы от базовых навыков до анализа инцидентов.",
          )}
        </p>
      </div>
      <div className="pathList">
        {paths.map((path, i) => {
          const chain = path.ids.map((id) => rooms.find((r) => r.id === id)!);
          return (
            <article className="panel path" key={path.title}>
              <button
                className="pathTitle"
                aria-expanded={active === i}
                onClick={() => select(active === i ? -1 : i)}
              >
                <span className={"tile " + path.color}>
                  <Route />
                </span>
                <div>
                  <h2>{tr(path.title)}</h2>
                  <p>{tr(path.desc)}</p>
                  <small>
                    {chain.length}
                    {tr(" модуля ·")} {chain.reduce((t, r) => t + r.minutes, 0)}
                    {tr(" мин")}
                  </small>
                </div>
                <ChevronDown size={18} />
              </button>
              {active === i && (
                <div className="chain">
                  {chain.map((r, i) => (
                    <button onClick={() => go("lab/" + r.id)} key={r.id}>
                      <span className="step">
                        {count(p, r.id) === r.lessons.length ? (
                          <Check size={16} />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <strong>{tr(r.title)}</strong>
                      <small>
                        {tr(names[r.difficulty])} · {r.minutes}
                        {tr(" мин")}
                      </small>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
export function Ranking({ p }: { p: Profile }) {
  const [month, set] = useState(false),
    list = board(p, month);
  return (
    <>
      <div className="pageTitle">
        <h1>
          {tr("Рейтинг")}
          <span className="titleDot">.</span>
        </h1>
        <p>{tr("Сравните свой результат с участниками учебного рейтинга.")}</p>
      </div>
      <div className="chips rankingFilter">
        {[false, true].map((m) => (
          <button
            key={String(m)}
            className={month === m ? "selected" : ""}
            onClick={() => set(m)}
          >
            {tr(m ? "За месяц" : "За всё время")}
          </button>
        ))}
      </div>
      <div className="podium">
        {list.slice(0, 3).map((r, i) => (
          <div
            className={"panel winner " + ["amber", "blue", "purple"][i]}
            key={r.name}
          >
            <Trophy />
            <span className="mono">
              0{i + 1}
              {tr(" / МЕСТО")}
            </span>
            <h2>{r.me && !p.user ? tr(r.name) : r.name}</h2>
            <strong>{num(r.points)} XP</strong>
          </div>
        ))}
      </div>
      <div className="panel tableWrap">
        <table>
          <caption>{tr("Учебная таблица лидеров")}</caption>
          <thead>
            <tr>
              {["Место", "Участник", "Страна", "Решено", "Опыт"].map((t) => (
                <th key={t}>{tr(t)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr className={r.me ? "me" : ""} key={i}>
                <td>#{i + 1}</td>
                <th>
                  {r.me && !p.user ? tr(r.name) : r.name}{" "}
                  {r.me && <small>{tr("вы")}</small>}
                </th>
                <td>{tr(r.country)}</td>
                <td>{r.solved}</td>
                <td>{num(r.points)} XP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Radar({ p }: { p: Profile }) {
  const labels = ["Web", "Сети", "Linux", "Криптография", "OSINT", "Реверс"],
    categories = [
      "Web",
      "Network",
      "Linux",
      "Cryptography",
      "OSINT",
      "Forensics",
    ];
  const values = categories.map((cat) => {
    const tasks =
      cat === "Forensics"
        ? [
            p.solves.some((s) => s.room === "forensics" && s.task === 0)
              ? 1
              : 0,
            1,
          ]
        : [
            p.solves.filter(
              (s) => rooms.find((r) => r.id === s.room)?.category === cat,
            ).length,
            rooms
              .filter((r) => r.category === cat)
              .reduce((a, r) => a + r.lessons.length, 0),
          ];
    return tasks[0] / tasks[1];
  });
  const xy = (i: number, scale: number) => {
    const a = ((i * 60 - 90) * Math.PI) / 180;
    return [180 + Math.cos(a) * 85 * scale, 120 + Math.sin(a) * 85 * scale];
  };
  const points = (v: number[]) => v.map((x, i) => xy(i, x).join(",")).join(" ");
  return (
    <svg
      className="radar"
      viewBox="0 0 360 245"
      role="img"
      aria-label={
        tr("Навыки: ") +
        labels
          .map((s, i) => tr(s) + " " + Math.round(values[i] * 100) + "%")
          .join(", ")
      }
    >
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon
          key={k}
          points={points(values.map(() => k))}
          fill="none"
          stroke="var(--border)"
        />
      ))}
      {labels.map((l, i) => {
        const [x, y] = xy(i, 1.28);
        return (
          <g key={l}>
            <line
              x1="180"
              y1="120"
              x2={xy(i, 1)[0]}
              y2={xy(i, 1)[1]}
              stroke="var(--border)"
            />
            <text
              x={x}
              y={y}
              dominantBaseline="middle"
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="12"
            >
              {tr(l)}
            </text>
          </g>
        );
      })}
      <polygon
        points={points(values)}
        fill="#94d94855"
        stroke="#73ae27"
        strokeWidth="2"
      />
    </svg>
  );
}
export function ProfileView({
  p,
  target,
  themeMode,
  setThemeMode,
  auth,
  logout,
  update,
  deleted,
}: {
  p: Profile;
  target?: string;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  auth: () => void;
  logout: () => Promise<void>;
  update: (p: Profile) => void;
  deleted: () => void;
}) {
  useEffect(() => {
    if (target !== "xp" && target !== "achievements" && target !== "completed") return;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById("profile-" + target);
      section?.focus({ preventScroll: true });
      section?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const deleteDialog = useRef<HTMLDialogElement>(null);
  async function saveAvatar(file: File | null) {
    setBusy(true);
    setMessage("");
    try {
      let avatar: string | null = null;
      if (file) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024)
          throw Error("Выберите JPEG, PNG или WebP размером до 8 МБ.");
        const bitmap = await createImageBitmap(file);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 384;
          const context = canvas.getContext("2d");
          if (!context) throw Error("Не удалось обработать фото. Выберите другой файл.");
          const size = Math.min(bitmap.width, bitmap.height);
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, 384, 384);
          context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 384, 384);
          avatar = canvas.toDataURL("image/jpeg", 0.85);
        } finally { bitmap.close(); }
      }
      update(await api("profile/avatar", { avatar }));
      setMessage("Фотография обновлена.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обработать фото. Выберите другой файл.");
    } finally { setBusy(false); }
  }
  async function deleteAccount() {
    setBusy(true);
    setMessage("");
    try {
      await api("profile/delete", { confirmation });
      deleteDialog.current?.close();
      deleted();
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  const r = rank(p),
    history = complete(p)
      .map((room) => ({
        room,
        day: p.solves
          .filter((s) => s.room === room.id)
          .map((s) => s.day)
          .sort()
          .at(-1),
      }))
      .sort((a, b) => String(b.day).localeCompare(String(a.day)));
  return (
    <>
      <div className="pageTitle">
        <h1>
          {tr("Профиль")}
          <span className="titleDot">.</span>
        </h1>
        <p>
          {tr(
            p.user
              ? "Ваш аккаунт и результаты обучения."
              : "Гостевой прогресс сохраняется в этом браузере.",
          )}
        </p>
      </div>
      <div className="panel profileHead profileDestination" id="profile-xp" tabIndex={-1}>
        <span className="avatar large">
          {(p.user?.name || tr("ОП")).slice(0, 2).toUpperCase()}
          {p.user?.picture && <img key={p.user.picture} src={p.user.picture} alt={tr("Фото профиля")} referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = "none"; }} />}
        </span>
        <div>
          <h2>{p.user?.name || tr("Оператор")}</h2>
          <small>
            {tr(r.title)} · {num(xp(p))} / {num(r.next)} XP
          </small>
        </div>
        <button className="secondary" onClick={p.user ? logout : auth}>
          {tr(p.user ? "Выйти" : "Войти или зарегистрироваться")}
        </button>
      </div>
      <section className="panel accountSettings">
        <h2>{tr("Настройки профиля")}</h2>
        {p.user && <dl className="accountDetails">
          <div><dt>{tr("Имя профиля")}</dt><dd>{p.user.name}</dd></div>
          <div><dt>{tr("Электронная почта")}</dt><dd>{p.user.email || tr("Адрес не указан")}</dd></div>
          <div><dt>{tr("Способ входа")}</dt><dd>{p.user.provider || "Google"}</dd></div>
        </dl>}
        <label className="profileLanguage">
          <span>{tr("Тема")}</span>
          <select className="profileThemeSelect" value={themeMode} onChange={event => setThemeMode(event.target.value as ThemeMode)}>
            {(Object.keys(themeLabels) as ThemeMode[]).map(mode => <option key={mode} value={mode}>{tr(themeLabels[mode])}</option>)}
          </select>
        </label>
        <div className="profileLanguage"><span>{tr("Язык интерфейса")}</span><LanguagePicker /></div>
        {p.user ? <>
          <div className="accountPhoto">
            <h3>{tr("Фото профиля")}</h3>
            <p>{tr("Можно использовать фото из аккаунта входа или загрузить своё.")}</p>
            <div className="accountActions">
              <label className="secondary photoUpload" aria-disabled={busy}>
                {tr(busy ? "Сохранение…" : "Изменить фото")}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
                  onChange={event => { const file = event.target.files?.[0]; if (file) void saveAvatar(file); event.target.value = ""; }} />
              </label>
              {p.user.picture !== p.user.googlePicture && <button className="secondary" disabled={busy} onClick={() => void saveAvatar(null)}>{tr(p.user.googlePicture ? "Вернуть исходное фото" : "Убрать фото")}</button>}
            </div>
            <small>{tr("JPEG, PNG или WebP, до 8 МБ. Фото обрезается до квадрата.")}</small>
          </div>
          <div className="accountActions">
            <button className="secondary" disabled={busy} onClick={() => void logout()}>{tr("Выйти из аккаунта")}</button>
            <button className="secondary dangerAction" disabled={busy} onClick={() => { setConfirmation(""); setMessage(""); deleteDialog.current?.showModal(); }}>{tr("Удалить аккаунт")}</button>
          </div>
        </> : <p>{tr("Войдите, чтобы изменить фото и управлять аккаунтом.")}</p>}
        {message && !deleteDialog.current?.open && <p role="status">{tr(message)}</p>}
      </section>
      <dialog ref={deleteDialog} className="authDialog deleteAccountDialog" aria-labelledby="delete-account-title" onCancel={event => { if (busy) event.preventDefault(); }}>
        <h2 id="delete-account-title">{tr("Удалить аккаунт?")}</h2>
        <p>{tr("Профиль CyberLime, прогресс и все сеансы входа будут удалены без возможности восстановления.")}</p>
        <label>{tr("Введите DELETE для подтверждения")}
          <input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" disabled={busy} />
        </label>
        {message && <p role="alert">{tr(message)}</p>}
        <div className="accountActions">
          <button className="secondary" disabled={busy} onClick={() => { deleteDialog.current?.close(); setMessage(""); }}>{tr("Отмена")}</button>
          <button className="secondary dangerAction" disabled={busy || confirmation !== "DELETE"} onClick={() => void deleteAccount()}>{tr(busy ? "Удаление…" : "Удалить аккаунт навсегда")}</button>
        </div>
      </dialog>
      <div className="profileGrid">
        <section className="panel">
          <h2>{tr("Матрица навыков")}</h2>
          <Radar p={p} />
        </section>
        <section className="panel profileDestination" id="profile-achievements" tabIndex={-1}>
          <h2>{tr("Достижения")}</h2>
          {achievements(p).map((a) => (
            <div
              className={"badgeRow " + (a.earned ? "earned" : "")}
              key={a.name}
            >
              {a.earned ? <Medal /> : <LockKeyhole />}
              <div>
                <strong>{tr(a.name)}</strong>
                <small>{tr(a.condition)}</small>
              </div>
            </div>
          ))}
        </section>
      </div>
      <div className="panel profileDestination" id="profile-completed" tabIndex={-1}>
        <h2>{tr("Пройденные комнаты")}</h2>
        {history.length ? (
          history.map((e) => (
            <button
              className="history"
              key={e.room.id}
              onClick={() => go("lab/" + e.room.id)}
            >
              <Flag size={16} />
              {tr(e.room.title)}
              <small>
                {calendarFormat( { timeZone: "UTC" }).format(
                  new Date(e.day!),
                )}
              </small>
              <ArrowRight size={15} />
            </button>
          ))
        ) : (
          <p>{tr("Здесь появится первая завершённая комната.")}</p>
        )}
      </div>
      <Heatmap p={p} />
    </>
  );
}
