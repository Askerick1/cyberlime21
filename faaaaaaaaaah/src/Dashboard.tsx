import {calendarFormat} from "./i18n";
import { useState } from "react";
import { shiftDay } from "../shared/activity.js";
import { courseIds } from "../shared/academy.js";
import { tr, locale } from "./i18n";
import {
  ArrowRight,
  BookmarkCheck,
  Box,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  ChevronLeft,
  Clock3,
  Cpu,
  Flag,
  Flame,
  FlaskConical,
  Hexagon,
  Layers3,
  Medal,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import {
  achievements,
  board,
  complete,
  count,
  dateKey,
  daysAgo,
  go,
  names,
  rooms,
  xp,
  type Room,
  type Profile,
} from "./data";
export const num = (n: number) => n.toLocaleString(locale());
export function Difficulty({ room }: { room: Room }) {
  return (
    <span className={"diff " + room.difficulty}>
      <ChartNoAxesColumnIncreasing size={13} />
      {tr(names[room.difficulty])}
    </span>
  );
}
export function Card({ room, p }: { room: Room; p: Profile }) {
  const n = count(p, room.id);
  return (
    <button
      className={"roomCard " + room.cover}
      onClick={() => go("lab/" + room.id)}
    >
      <div className="cardCover">
        <img src={"/art/lab-" + room.cover + ".png"} alt="" />
        <span className="coverTag">{tr(names[room.category])}</span>
        {n === room.lessons.length && (
          <span className="coverDone" aria-label={tr("Решено")}>
            <BookmarkCheck size={16} />
          </span>
        )}
      </div>
      <div className="cardBody">
        <div className="cardMeta">
          <Difficulty room={room} />
          <span>
            <Clock3 size={13} />
            {room.minutes}
            {tr(" мин")}
          </span>
        </div>
        <h3>{tr(room.title)}</h3>
        <p>{tr(room.description)}</p>
        <div className="cardFoot">
          <span className="points">
            <Zap size={14} />
            {room.lessons.length * 150} XP
          </span>
          <span>
            <Star size={13} />
            {room.rating === "—" ? "—" : Number(room.rating.replace(",", ".")).toLocaleString(locale(), {
              minimumFractionDigits: 1,
            })}
          </span>
          <ArrowRight className="cardArrow" size={17} />
        </div>
        {n > 0 && (
          <div
            className="cardProgress"
            aria-label={tr("Прогресс ") + n + tr(" из ") + room.lessons.length}
          >
            <i style={{ width: (n / room.lessons.length) * 100 + "%" }} />
          </div>
        )}
      </div>
    </button>
  );
}
export function Heatmap({ p }: { p: Profile }) {
  const todayKey = daysAgo(0),
    today = new Date(todayKey + "T12:00:00Z"),
    year = today.getUTCFullYear();
  const days = Array.from({ length: 365 }, (_, i) =>
    shiftDay(todayKey, i - 364),
  );
  const [selection, selectDay] = useState<string | null>(null);
  const selected = selection && days.includes(selection) ? selection : todayKey;
  const format = calendarFormat( {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const offset = (new Date(days[0]).getUTCDay() + 6) % 7;
  const counts = new Map<string, number>();
  p.solves.forEach((s) => counts.set(s.day, (counts.get(s.day) || 0) + 1));
  const monthLabels = Array.from({ length: 12 }, (_, i) =>
    calendarFormat( { month: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(year, today.getUTCMonth() - 11 + i, 1)))
      .replace(".", ""),
  );
  return (
    <section className="panel heat">
      <div className="sectionHead">
        <h2>{tr("Активность за год")}</h2>
        <span className="muted mono">
          {days[0].slice(0, 4)} — {year}
        </span>
      </div>
      <div className="heatScroll">
        <div className="heatInner">
          <div className="months">
            {monthLabels.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
          <div className="cells">
            {Array.from({ length: offset }, (_, i) => (
              <i key={"blank" + i} className="blank" />
            ))}
            {days.map((d, index) => {
              const label =
                format.format(new Date(d + "T12:00:00Z")) +
                tr(" · заданий: ") +
                (counts.get(d) || 0);
              return (
                <button
                  type="button"
                  className="heatDay"
                  key={d}
                  data-date={d}
                  title={label}
                  aria-label={label}
                  aria-pressed={d === selected}
                  tabIndex={d === selected ? 0 : -1}
                  data-tone={Math.min(counts.get(d) || 0, 3)}
                  onClick={() => selectDay(d)}
                  onKeyDown={(e) => {
                    const moves: Record<string, number> = {
                      ArrowLeft: -7,
                      ArrowRight: 7,
                      ArrowUp: -1,
                      ArrowDown: 1,
                    };
                    if (!(e.key in moves)) return;
                    e.preventDefault();
                    const next =
                      days[
                        Math.max(
                          0,
                          Math.min(days.length - 1, index + moves[e.key]),
                        )
                      ];
                    selectDay(next);
                    e.currentTarget.parentElement
                      ?.querySelector<HTMLButtonElement>(
                        '[data-date="' + next + '"]',
                      )
                      ?.focus();
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="heatFooter">
        <span className="heatDetail" aria-live="polite">
          {format.format(new Date(selected + "T12:00:00Z"))}
          {tr(" · заданий: ")}
          {counts.get(selected) || 0}
        </span>
        <div className="legend">
          <span>{tr("Меньше")}</span>
          {[0, 1, 2, 3].map((n) => (
            <i key={n} data-tone={n} />
          ))}
          <span>{tr("Больше")}</span>
        </div>
      </div>
    </section>
  );
}
export function Dashboard({ p }: { p: Profile }) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [previous, setPrevious] = useState<number | null>(null);
  const r = rooms.find((r) => r.id === (p.user ? p.last : courseIds[0])) || rooms[0],
    n = count(p, r.id),
    percent = Math.round((n / r.lessons.length) * 100);
  const slides = [
    {
      title: r.title, description: r.description, href: "lab/" + r.id,
      label: n ? "ПРОДОЛЖИТЬ ОБУЧЕНИЕ" : "ПЕРВАЯ КОМНАТА",
      action: n === r.lessons.length ? "Открыть комнату" : n ? "Продолжить" : "Начать обучение",
    },
    { title: "Последовательный курс", description: "Восемь модулей: от основ защиты до реагирования. Выполняйте уроки и практику по порядку.", href: "course", action: "Открыть курс" },
    { title: "Каталог комнат", description: "Выберите тему и уровень сложности, затем попробуйте свои силы в комнате. Разберите сетевой журнал, проверьте права доступа или найдите след в цифровых уликах. За решённые задания вы получите XP.", href: "rooms", action: "Все комнаты" },
  ];
  const slideCount = slides.length;
  const moveSlide = (step: number) => {
    setPrevious(slide);
    setDirection(step);
    setSlide(current => (current + step + slideCount) % slideCount);
  };
  const stats = [
    {
      label: "Всего опыта",
      value: num(xp(p)),
      suffix: "XP",
      icon: Zap,
      color: "green",
      href: "profile/xp",
    },
    {
      label: "Решено комнат",
      value: complete(p).length,
      suffix: "/ " + rooms.length,
      icon: FlaskConical,
      color: "blue",
      href: "profile/completed",
    },
    {
      label: "Место в рейтинге",
      value: "#" + (board(p).findIndex((x) => x.me) + 1),
      suffix: "",
      icon: Trophy,
      color: "amber",
      href: "ranking",
    },
    {
      label: "Достижения",
      value: achievements(p).filter((x) => x.earned).length,
      suffix: "/ 4",
      icon: Medal,
      color: "purple",
      href: "profile/achievements",
    },
  ];
  return (
    <>
      <div className="pageTitle dashboardTitle">
        <div>
          <h1>{tr("Главная")}<span className="titleDot">.</span></h1>
          <p>
            {p.user
              ? tr("С возвращением, ") + p.user.name + "."
              : tr("Добро пожаловать, оператор.")}{" "}
            {tr("Ваша учебная активность и лаборатории.")}
          </p>
        </div>
        <span className="date mono">
          {calendarFormat( {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
            .format(new Date())
            .replace(" г.", "")}
        </span>
      </div>
      <section className="dashboardCarousel" aria-label={tr("Разделы сайта")} data-direction={direction < 0 ? "back" : "forward"}>
        {slides.map((item, index) => <div className="hero dashboardSlide" key={item.href}
          data-active={index === slide} data-leaving={index === previous} aria-hidden={index !== slide} inert={index !== slide}>
        <img
          className={index === 0 ? "heroArt" : "heroArt diagramArt"}
          src={["/art/server-stack.png", "/art/lab-terminal.png", "/art/lab-network.png"][index]}
          alt=""
        />
        <div className={"heroInfo" + (index === 0 ? "" : " heroInfoSection")}>
          {item.label && <div className="heroLabel">
            <span className="liveDot" />
            {tr(item.label)}
          </div>}
          <h2>{tr(item.title)}</h2>
          <p>{tr(item.description)}</p>
          {index === 0 && <div className="heroProgress">
            <div>
              <span>{tr("Прогресс комнаты")}</span>
              <strong>{percent}%</strong>
            </div>
            <div className="track">
              <i style={{ width: percent + "%" }} />
            </div>
          </div>}
          <a className="primary" href={"#" + item.href}>
            {tr(item.action)}
            <ArrowRight size={16} />
          </a>
        </div>
        </div>)}
        <button className="carouselArrow carouselPrevious" type="button" aria-label={tr("Предыдущий баннер")} onClick={() => moveSlide(-1)}><ChevronLeft size={16} /></button>
        <button className="carouselArrow carouselNext" type="button" aria-label={tr("Следующий баннер")} onClick={() => moveSlide(1)}><ChevronRight size={16} /></button>
        <div className="carouselDots" role="status" aria-atomic="true">
          <span className="sr-only">{tr("Слайд")} {slide + 1} / {slideCount}: {tr(slides[slide].title)}</span>
          {slides.map((item, index) => <span key={item.href} className="carouselDot" data-current={index === slide} aria-hidden="true" />)}
        </div>
      </section>
      <section className="stats">
        {stats.map((s) => (
          <a className="stat statLink" key={s.label} href={"#" + s.href}>
            <span className={"tile " + s.color}>
              <s.icon size={19} />
            </span>
            <div>
              <small>{tr(s.label)}</small>
              <strong>
                {s.value} <em>{s.suffix}</em>
              </strong>
            </div>
            <ChevronRight className="statArrow" size={16} aria-hidden="true" />
          </a>
        ))}
      </section>
      <section>
        <div className="sectionHead">
          <div>
            <h2>{tr("Рекомендуемые комнаты")}</h2>
          </div>
          <button className="textBtn more" onClick={() => go("rooms")}>
            {tr("Все комнаты ")}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="cards recommendedRooms">
          {[rooms[3], rooms[1], rooms[2]].map((r) => (
            <Card key={r.id} room={r} p={p} />
          ))}
        </div>
      </section>
      <Heatmap p={p} />
    </>
  );
}
