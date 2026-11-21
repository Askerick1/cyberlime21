import {calendarFormat} from "./i18n";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Flame, Globe2, X } from "lucide-react";
import { activitySummary, studyDay } from "../shared/activity.js";
import { languages, locale, setLanguage, tr, type Language } from "./i18n";
import type { Profile } from "./data";

export function LanguagePicker() {
  return (
    <label className="languageControl" title={tr("Язык")}>
      <Globe2 size={16} aria-hidden="true" />
      <span aria-hidden="true">{locale().toUpperCase()}</span>
      <ChevronDown size={12} aria-hidden="true" />
      <select
        aria-label={tr("Язык")}
        value={locale()}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        {Object.entries(languages).map(([id, name]) => (
          <option key={id} lang={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function useStudyDay() {
  const [day, setDay] = useState(() => studyDay());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date(),
        midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setDay(studyDay(now));
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 40);
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return day;
}
export function StreakControl({ p, day }: { p: Profile; day: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const { current, best, done, week } = activitySummary(p.solves, day);
  useEffect(() => {
    if (!open) return;
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const formatter = calendarFormat( {
    weekday: "short",
    timeZone: "UTC",
  });
  const fullDate = calendarFormat( {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return (
    <div
      className="streakWrap"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className={"streak streakTrigger" + (done ? " earned" : "")}
        aria-expanded={open}
        aria-controls="study-streak"
        aria-label={tr("Ежедневная серия") + " · " + current}
        title={tr("Ежедневная серия")}
        onClick={() => setOpen(!open)}
      >
        <Flame size={16} />
        <b key={current}>{current}</b>
      </button>
      {open && (
        <section
          className="streakPanel"
          id="study-streak"
          aria-label={tr("Ежедневная серия")}
        >
          <div className="streakHead">
            <Flame size={19} />
            <h2>{tr("Ежедневная серия")}</h2>
            <button
              className="iconBtn"
              aria-label={tr("Закрыть")}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <X size={15} />
            </button>
          </div>
          <div className="streakMetrics">
            <div>
              <strong>{current}</strong>
              <small>{tr("Дни подряд")}</small>
            </div>
            <div>
              <strong>{best}</strong>
              <small>{tr("Личный рекорд")}</small>
            </div>
          </div>
          <div className="streakWeek" aria-label={tr("За последние 7 дней")}>
            {week.map(({ date, completed }) => {
              const instant = new Date(date + "T12:00:00Z");
              const label =
                fullDate.format(instant) +
                " · " +
                tr(completed ? "День с занятием" : "Без занятия");
              return (
                <div
                  key={date}
                  className={date === day ? "isToday" : ""}
                  title={label}
                  aria-label={label}
                >
                  <i className={completed ? "marked" : ""}>
                    {completed ? <Check size={15} /> : <span />}
                  </i>
                  <small>{formatter.format(instant)}</small>
                </div>
              );
            })}
          </div>
          <p role="status">
            {tr(
              done
                ? "День засчитан"
                : current === 0
                  ? "Серия начнётся с первого решённого задания."
                  : "Решите одно новое задание, чтобы засчитать день.",
            )}
          </p>
        </section>
      )}
    </div>
  );
}
