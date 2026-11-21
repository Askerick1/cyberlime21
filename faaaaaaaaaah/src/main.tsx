import { Training } from "./Training";
import { Welcome } from "./Welcome";
import { ProfileControl } from "./ProfileControl";
import { courseIds, courseUnlocked, taskUnlocked } from "../shared/academy.js";
import { reward, maxMistakes } from "../shared/rewards.js";
import { searchable, tr, useLanguage } from "./i18n";
import { StreakControl, useStudyDay } from "./StudyControls";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { MotionConfig, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ChevronsUpDown,
  ChevronRight,
  ChevronsRight,
  Command,
  Flame,
  FlaskConical,
  LayoutDashboard,
  LogIn,
  Menu,
  PanelLeft,
  Route,
  Search,
  Shield,
  SquareTerminal,
  Terminal,
  Trophy,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import {
  api,
  ApiError,
  attemptFor,
  count,
  daysAgo,
  go,
  guest,
  names,
  rank,
  rooms,
  xp,
  type Profile,
  type TaskAttempt,
  type Room,
} from "./data";
import { Dashboard, num } from "./Dashboard";
import { Catalog, Paths, ProfileView, Ranking } from "./Sections";
import { Lab } from "./Lab";
import { Auth } from "./Auth";
import "./style.css";
import "./views.css";
import "./training.css";
import "./interactions.css";
import type { ThemeMode } from "./data";
const deviceTheme = window.matchMedia("(prefers-color-scheme: dark)");
const nav = [
  { id: "dashboard", name: "Главная", icon: LayoutDashboard },
  { id: "course", name: "Последовательный курс", icon: Route },
  { id: "hacking", name: "Взлом", icon: SquareTerminal },
  { id: "paths", name: "Пути обучения", icon: Route },
  { id: "rooms", name: "Комнаты", icon: FlaskConical },
  { id: "ranking", name: "Рейтинг", icon: Trophy },
  { id: "profile", name: "Профиль", icon: UserRound },
];
const route = () => location.hash.replace(/^#\/?/, "") || "dashboard";
function App() {
  const language = useLanguage(),
    today = useStudyDay();
  const [path, setPath] = useState(route),
    [p, profile] = useState<Profile>(guest),
    [themeMode, setThemeMode] = useState<ThemeMode>(() => {
      const saved = localStorage.getItem("cyberlime.themePreference");
      return saved === "light" || saved === "dark" ? saved : "system";
    }),
    [deviceDark, setDeviceDark] = useState(() => deviceTheme.matches),
    [menu, showMenu] = useState(false),
    [auth, showAuth] = useState(false),
    [q, search] = useState(""),
    [focus, setFocus] = useState(false),
    [toast, notify] = useState(""),
    [ready, setReady] = useState(false);
  const dark = themeMode === "system" ? deviceDark : themeMode === "dark";
  const searchRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const lastGuestPage = useRef<string | null>(null);
  const [section, id] = path.split("?")[0].split("/"),
    room = rooms.find((r) => r.id === id),
    current = nav.find((n) => n.id === (section === "lab" ? "rooms" : section)),
    r = rank(p);
  useEffect(() => {
    if (section === "welcome" && p.user) {
      history.replaceState(history.state, "", "#dashboard");
      setPath("dashboard");
      window.scrollTo(0, 0);
    }
  }, [section, p.user]);
  useEffect(() => {
    const handler = () => {
      const navigate = () => {
        setPath(route());
        showMenu(false);
        setFocus(false);
        search("");
        window.scrollTo(0, 0);
      };
      if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.startViewTransition(() => flushSync(navigate));
      } else navigate();
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const key = "cyberlime.guestNavigationCount";
    const page = path.split("?")[0];
    const previous = lastGuestPage.current;
    lastGuestPage.current = page;
    if (p.user || auth) {
      sessionStorage.removeItem(key);
      return;
    }
    if (previous === null || previous === page) return;
    const visits = (Number(sessionStorage.getItem(key)) || 0) + 1;
    if (visits >= 5) {
      sessionStorage.removeItem(key);
      showAuth(true);
    } else sessionStorage.setItem(key, String(visits));
  }, [ready, path, auth, p.user]);
  useEffect(() => {
    async function init() {
      const githubResult = new URLSearchParams(location.search).get("github");
      if (githubResult) {
        const returnHash = sessionStorage.getItem("cyberlime.githubReturn");
        sessionStorage.removeItem("cyberlime.githubReturn");
        history.replaceState(null, "", location.pathname + (returnHash?.startsWith("#") ? returnHash : ""));
        setPath(route());
      }
      try {
        const remote = await api("me");
        if (remote.user) {
          profile(remote);
          if (githubResult === "ok") notify("Вы вошли в CyberLime.");
        } else if (githubResult || (route() !== "welcome" && !localStorage.getItem("cyberlime.signupPromptSeen"))) {
          localStorage.setItem("cyberlime.signupPromptSeen", "1");
          showAuth(true);
          if (githubResult) notify("Не удалось войти через GitHub. Попробуйте снова.");
        }
      } catch {
        notify("Сервер недоступен. Открыт гостевой режим.");
      } finally {
        setReady(true);
      }
    }
    init();
  }, []);
  useEffect(() => {
    if (!window.IntersectionObserver || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const page = pageRef.current;
    if (!page) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1 });
    const observe = () => page.querySelectorAll(".panel, .roomCard, .labTerminal, .dashboardCarousel").forEach(panel => {
      if (!panel.classList.contains("in-view") && (panel.classList.contains("reveal-panel") || panel.getBoundingClientRect().top > window.innerHeight)) {
        panel.classList.add("reveal-panel");
        observer.observe(panel);
      }
    });
    observe();
    const updates = new MutationObserver(observe);
    updates.observe(page, { childList: true, subtree: true });
    return () => { observer.disconnect(); updates.disconnect(); };
  }, [path, ready]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    localStorage.setItem("cyberlime.themePreference", themeMode);
  }, [themeMode]);
  useEffect(() => {
    const syncTheme = () => setDeviceDark(deviceTheme.matches);
    deviceTheme.addEventListener("change", syncTheme);
    syncTheme();
    return () => deviceTheme.removeEventListener("change", syncTheme);
  }, []);
  useEffect(() => {
    if (!p.user) localStorage.setItem("cyberlime.guest.v2", JSON.stringify(p));
  }, [p]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => notify(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setFocus(false);
        showMenu(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => {
    document.title =
      tr(
        (section === "welcome" ? "Кибербезопасность на практике" : section === "lab" ? room?.title : current?.name) ||
          "Страница не найдена",
      ) + " · CyberLime";
  }, [path, language]);
  useEffect(() => {
    if (!ready || section !== "lab" || !room) return;
    let active = true;
    if (p.user)
      api("visit", { room: room.id })
        .then(() => {
          if (active) profile((prev) => ({ ...prev, last: room.id }));
        })
        .catch((e) => notify(e.message));
    else profile((prev) => ({ ...prev, last: room.id }));
    return () => {
      active = false;
    };
  }, [path, ready, p.user?.name]);
  async function solve(room: Room, task: number, answer: string) {
    if (!p.user && room.id !== courseIds[0]) throw Error("Войдите, чтобы продолжить обучение.");
    if (room.mode === "course" && !courseUnlocked(room.id, p.solves)) throw Error("Сначала завершите предыдущий модуль.");
    if (!taskUnlocked(room, task, p.solves)) throw Error("Сначала завершите предыдущий этап.");
    if (p.user) {
      try {
        profile(await api("solve", {
          room: room.id,
          task,
          answer,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }));
      } catch (error) {
        if (error instanceof ApiError && error.profile) profile(error.profile);
        throw error;
      }
    } else {
      if (!answer.trim()) throw Error("Введите ответ.");
      if (answer.trim() !== "FLAG{" + room.lessons[task].value + "}") {
        updateGuestAttempt(room.id, task, attempt => ({ ...attempt, mistakes: Math.min(attempt.mistakes + 1, maxMistakes) }));
        throw Error("Ответ не принят.");
      }
      profile((prev) =>
        prev.solves.some((s) => s.room === room.id && s.task === task)
          ? prev
          : {
              ...prev,
              last: room.id,
              solves: [
                ...prev.solves,
                { room: room.id, task, day: daysAgo(0), xp: reward(attemptFor(prev, room.id, task)) },
              ],
              attempts: prev.attempts?.filter(a => a.room !== room.id || a.task !== task),
            },
      );
    }
  }
  function updateGuestAttempt(room: string, task: number, update: (attempt: TaskAttempt) => TaskAttempt) {
    profile(prev => {
      if (prev.user || prev.solves.some(s => s.room === room && s.task === task)) return prev;
      const attempts = prev.attempts?.filter(a => a.room !== room || a.task !== task) ?? [];
      return { ...prev, attempts: [...attempts, update(attemptFor(prev, room, task))] };
    });
  }
  async function revealHint(room: Room, task: number, hint: number) {
    if (!p.user && room.id !== courseIds[0]) throw Error("Войдите, чтобы продолжить обучение.");
    if (p.user) profile(await api("hint", { room: room.id, task, hint }));
    else updateGuestAttempt(room.id, task, attempt => ({ ...attempt, hints: Math.max(attempt.hints, hint) }));
  }
  const logout = async () => {
    try {
      await api("logout", {});
      profile(guest());
      notify("Вы вышли из аккаунта.");
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const hits = rooms
    .filter((v) =>
      searchable([v.title, v.description, v.category, names[v.category]], q),
    )
    .slice(0, 5);
  return (
    <MotionConfig reducedMotion="user">
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        {tr("К содержимому")}
      </a>
      {section === "welcome" ? (ready && !p.user && <Welcome signIn={() => showAuth(true)} />) : <>
      {menu && (
        <button
          className="scrim"
          aria-label={tr("Закрыть меню")}
          onClick={() => showMenu(false)}
        />
      )}
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a href="#dashboard" aria-label="CyberLime" className="brand">
          <span className="brandIcon">
            <Terminal size={23} strokeWidth={3} />
          </span>
          Cyber<span>Lime</span>
          <i />
        </a>
        <div className="sideCaption">{tr("ПЛАТФОРМА")}</div>
        <nav>
          {nav.map((n) => (
            <a
              key={n.id}
              className={current?.id === n.id ? "active" : ""}
              aria-current={current?.id === n.id ? "page" : undefined}
              href={"#" + n.id}
            >
              <n.icon size={18} />
              {tr(n.name)}
              {n.id === "rooms" && <small>{String(rooms.length).padStart(2, "0")}</small>}
            </a>
          ))}
        </nav>
        <div className="sideBottom">
          <a className="rank rankLink" href="#profile/xp">
            <div className="sideCaption">{tr("ТЕКУЩИЙ РАНГ")}</div>
            <div className="rankName">
              <Shield size={19} />
              {tr(r.title)}
              <span className="mono">{r.code}</span>
            </div>
            <div className="rankTrack">
              <i style={{ width: ((xp(p) % 600) / 600) * 100 + "%" }} />
            </div>
            <small className="mono">
              {num(xp(p))} / {num(r.next)} XP
            </small>
          </a>
          <button
            className="userBtn"
            onClick={() => (p.user ? go("profile") : showAuth(true))}
          >
            <span className="avatar">
              {(p.user?.name || tr("ОП")).slice(0, 2).toUpperCase()}
              {p.user?.picture && <img key={p.user.picture} src={p.user.picture} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = "none"; }} />}
            </span>
            <span>
              <strong>{p.user?.name || tr("Оператор")}</strong>
              <small>{tr(p.user ? "Мой профиль" : "Гостевой профиль")}</small>
            </span>
            <ChevronsUpDown size={15} />
          </button>
        </div>
      </aside>
      <div className="shell">
        <header className="topbar">
          <button
            className="mobile iconBtn"
            onClick={() => showMenu(true)}
            aria-label={tr("Открыть меню")}
          >
            <Menu />
          </button>
          <a className="headerBrand" href="#dashboard" aria-label="CyberLime">
            <Terminal size={17} aria-hidden="true" />
            <span>CyberLime</span>
          </a>
          <div className="topTools">
            <div
              className="globalSearch"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false);
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  go("rooms?q=" + encodeURIComponent(q));
                  setFocus(false);
                  searchRef.current?.blur();
                }}
              >
                <Search size={15} />
                <input
                  ref={searchRef}
                  aria-label={tr("Глобальный поиск")}
                  placeholder={tr("Поиск по платформе")}
                  value={q}
                  onChange={(e) => {
                    search(e.target.value);
                    setFocus(true);
                  }}
                  onFocus={() => setFocus(true)}
                />
                <kbd>Ctrl K</kbd>
              </form>
              {focus && q && (
                <div className="results">
                  {hits.length ? (
                    hits.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          go("lab/" + v.id);
                          setFocus(false);
                        }}
                      >
                        <FlaskConical size={15} />
                        {tr(v.title)}
                        <ChevronRight size={13} />
                      </button>
                    ))
                  ) : (
                    <p>{tr("Комнаты не найдены")}</p>
                  )}
                </div>
              )}
            </div>
            <StreakControl p={p} day={today} />
            <ProfileControl p={p} dark={dark} themeMode={themeMode} setThemeMode={setThemeMode}
              auth={() => showAuth(true)} logout={logout}/>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <motion.div
            className="page"
            ref={pageRef}
            key={path}
            initial={{ opacity: 0.72, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            {section === "dashboard" ? (
              <Dashboard p={p} />
            ) : section === "rooms" ? (
              <Catalog
                p={p}
                initial={new URLSearchParams(path.split("?")[1]).get("q") || ""}
              />
            ) : section === "course" ? (
              <Training p={p} auth={() => showAuth(true)} />
            ) : section === "hacking" ? (
              <Training p={p} auth={() => showAuth(true)} hacking />
            ) : section === "paths" ? (
              <Paths p={p} />
            ) : section === "ranking" ? (
              <Ranking p={p} />
            ) : section === "profile" ? (
              <ProfileView p={p} target={id} themeMode={themeMode} setThemeMode={setThemeMode} auth={() => showAuth(true)} logout={logout} update={profile} deleted={() => { profile(guest()); go("dashboard"); notify("Аккаунт удалён."); }} />
            ) : section === "lab" && room ? (
              !ready ? <p role="status">{tr("Загрузка…")}</p> : p.user || room.id === courseIds[0] ? (
                <Lab key={room.id} room={room} p={p} solve={solve} revealHint={revealHint} />
              ) : (
                <section className="panel empty">
                  <h1>{tr(room.title)}</h1>
                  <p>{tr("Первый модуль доступен гостям. Войдите, чтобы открыть остальные задания.")}</p>
                  <button className="primary" onClick={() => showAuth(true)}>{tr("Войти или зарегистрироваться")}</button>
                  <button className="textBtn" onClick={() => go("lab/" + courseIds[0])}>{tr("Попробовать первый модуль")}</button>
                </section>
              )
            ) : (
              <div className="panel empty">
                <h1>{tr("Страница не найдена")}</h1>
                <button className="primary" onClick={() => go("dashboard")}>
                  {tr("На главную")}
                </button>
              </div>
            )}
          </motion.div>
          <footer>
            <span className="footBrand">
              <Terminal size={14} /> CyberLime
            </span>
            <span>{tr("Лаборатория кибербезопасности")}</span>
          </footer>
        </main>
      </div>
      </>}
      {auth && (
        <Auth
          close={() => showAuth(false)}
          done={async () => {
            const remote = await api("me");
            if (!remote.user)
              throw Error(
                "Не удалось открыть сессию. Разрешите cookie и повторите вход.",
              );
            profile(remote);
            showAuth(false);
            if (section === "welcome") go("dashboard");
            notify("Вы вошли в CyberLime.");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Zap size={16} />
          {tr(toast)}
        </div>
      )}
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
