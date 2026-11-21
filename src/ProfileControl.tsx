import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Languages, LogIn, LogOut, Monitor, Moon, Settings, Sun, UserRound } from "lucide-react";
import { go, themeLabels, type Profile, type ThemeMode } from "./data";
import { languages, locale, setLanguage, tr, type Language } from "./i18n";

export function ProfileControl({p, dark, themeMode, setThemeMode, auth, logout}: {
  p: Profile; dark: boolean; themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => void;
  auth: () => void; logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "theme" | "language">("main");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {setOpen(false); trigger.current?.focus();};
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {if (event.key === "Escape") close();};
    const navigate = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("hashchange", navigate);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("hashchange", navigate);
    };
  }, [open]);
  return <div className="profileControl" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} className="iconBtn theme headerProfile" aria-label={tr("Профиль")}
      title={tr("Профиль")} aria-expanded={open} aria-controls="profile-popover"
      onClick={() => { setView("main"); setOpen(value => !value); }}>
      <UserRound size={18} aria-hidden="true" />
      {p.user?.picture && <img key={p.user.picture} className="headerAvatar" src={p.user.picture} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = "none"; }} />}
    </button>
    {open && <section className="streakPanel profilePanel" id="profile-popover" aria-label={tr("Профиль")}>
      {view === "main" ? <>
        <div className="profileMenuIdentity">
          <span className="avatar profileMenuAvatar">
            {(p.user?.name || tr("ОП")).slice(0, 2).toUpperCase()}
            {p.user?.picture && <img key={p.user.picture} src={p.user.picture} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = "none"; }} />}
          </span>
          <div className="profileIdentity">
            <strong>{p.user?.name || tr("Оператор")}</strong>
            <span>{p.user?.email || tr(p.user ? "Аккаунт CyberLime" : "Гостевой профиль")}</span>
            <button className="profileMenuLink" onClick={() => { setOpen(false); go("profile"); }}>{tr("Открыть профиль")}</button>
          </div>
        </div>
        <div className="profileMenuGroup">
          <button className="profileAction" onClick={() => {setOpen(false); go("profile");}}>
            <Settings size={22}/><span>{tr("Настройки профиля")}</span><ChevronRight className="profileMenuChevron" size={18}/>
          </button>
          <button className="profileAction" onClick={() => {setOpen(false); if (p.user) void logout(); else auth();}}>
            {p.user ? <LogOut size={22}/> : <LogIn size={22}/>}
            <span>{tr(p.user ? "Выйти из аккаунта" : "Войти или зарегистрироваться")}</span>
          </button>
        </div>
        <div className="profileMenuGroup">
          <button className="profileAction" onClick={() => setView("theme")}>
            {dark ? <Moon size={22}/> : <Sun size={22}/>}<span>{tr("Тема")}: {tr(themeLabels[themeMode])}</span><ChevronRight className="profileMenuChevron" size={18}/>
          </button>
          <button className="profileAction" onClick={() => setView("language")}>
            <Languages size={22}/><span>{tr("Язык интерфейса")}: {languages[locale()]}</span><ChevronRight className="profileMenuChevron" size={18}/>
          </button>
        </div>
      </> : <>
        <div className="profileSubmenuHead">
          <button className="iconBtn" aria-label={tr("Назад")} onClick={() => setView("main")}><ArrowLeft size={20}/></button>
          <h2>{tr(view === "theme" ? "Тема" : "Язык интерфейса")}</h2>
        </div>
        <div className="profileMenuGroup" role="group" aria-label={tr(view === "theme" ? "Тема" : "Язык интерфейса")}>
          {view === "theme" ? (["system", "light", "dark"] as const).map(value => <button key={value} className="profileAction" aria-pressed={themeMode === value} onClick={() => setThemeMode(value)}>
            {value === "system" ? <Monitor size={22}/> : value === "dark" ? <Moon size={22}/> : <Sun size={22}/>}
            <span>{tr(themeLabels[value])}</span>{themeMode === value && <Check className="profileMenuChevron" size={18}/>}
          </button>) : Object.entries(languages).map(([id, name]) => <button key={id} className="profileAction" aria-pressed={locale() === id} onClick={() => setLanguage(id as Language)}>
            <span lang={id}>{name}</span>{locale() === id && <Check className="profileMenuChevron" size={18}/>}
          </button>)}
        </div>
      </>}
    </section>}
  </div>;
}
