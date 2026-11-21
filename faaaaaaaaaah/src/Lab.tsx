import { Exercise } from "./Training";
import { academyRooms, courseUnlocked, taskUnlocked } from "../shared/academy.js";
import { tr } from "./i18n";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clipboard,
  Lightbulb,
  Terminal,
  Flag,
  RotateCcw,
} from "lucide-react";
import { go, count, earnedXP, attemptFor, type Room, type Profile } from "./data";
import { reward, taskXP, hintCost } from "../shared/rewards.js";
type Props = {
  room: Room;
  p: Profile;
  solve: (r: Room, i: number, answer: string) => Promise<void>;
  revealHint: (r: Room, i: number, hint: number) => Promise<void>;
};
const retryTips: Record<string, string> = {
  choice: "Найдите в условии факт, который подтверждает ваш вариант. Правдоподобный вариант может опираться на предположение, которого нет в задании.",
  order: "Сверьте время и причинно-следственные связи. Событие, которое запускает другое, должно стоять раньше него.",
  fix: "Сверьте новое значение с правилом из условия. Исправление должно устранять причину ошибки и сохранять нужное поведение.",
  simulation: "Сравните ответ учебного симулятора с тем, что просит задание. В ответе могут быть дополнительные данные, которые не нужно отправлять.",
  flag: "Сверьте значение с указанным источником и форматом FLAG{…}. Регистр и лишние символы влияют на точное совпадение.",
};
function run(line: string, r: Room) {
  const [cmd, ...args] = line.trim().split(/\s+/);
  const file = args.at(-1)?.replace(/^\.\//, "");
  const item = r.lessons.find((l) => l.file === file);
  switch (cmd) {
    case "help":
      return "ls                  список файлов\ncat ФАЙЛ            прочитать файл\nstrings ФАЙЛ        извлечь читаемые строки\nbase64 -d ФАЙЛ      декодировать Base64\nnmap                открыть сохранённую сводку\nwhoami, pwd, clear  сведения и очистка";
    case "ls":
      return r.lessons.map((l) => l.file).join("   ");
    case "pwd":
      return "/home/analyst/" + r.id;
    case "whoami":
      return "analyst";
    case "nmap":
      return args.length
        ? "Используйте nmap без аргументов для просмотра снимка."
        : r.lessons.find((l) => l.file === "inventory.txt")?.artifact ||
            "Сохранённый снимок узла lab-station\n443/tcp  https";
    case "cat":
    case "strings":
    case "base64":
      if (!item) return "Файл не найден. Список доступен по команде ls.";
      if (cmd === "cat") return item.artifact;
      if (cmd === "strings")
        return (
          item.artifact.match(/[ -~]{4,}/g)?.join("\n") || "Нет читаемых строк."
        );
      if (args[0] !== "-d") return "Формат команды: base64 -d ФАЙЛ";
      try {
        return atob(item.artifact);
      } catch {
        return "Файл не содержит корректной строки Base64.";
      }
    default:
      return "Неизвестная команда. Введите help.";
  }
}
export function Lab({ room, p, solve, revealHint }: Props) {
  const [opened, open] = useState(
      Math.max(
        0,
        room.lessons.findIndex(
          (_, i) => !p.solves.some((s) => s.room === room.id && s.task === i),
        ),
      ),
    ),
    [answer, setAnswer] = useState(""),
    [error, setErr] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, copy] = useState(false),
    [line, setLine] = useState(""),
    [history, log] = useState<{ cmd: string; out: string }[]>([]),
    [pos, setPos] = useState(-1);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (history.length) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [history]);
  const moduleLocked = room.mode === "course" && !courseUnlocked(room.id, p.solves);
  if (moduleLocked) return <div className="panel empty"><h1>{tr(room.title)}</h1><p>{tr("Сначала завершите предыдущий модуль.")}</p><button className="primary" onClick={() => go("course")}>{tr("Последовательный курс")}</button></div>;
  const nextModule = academyRooms[academyRooms.findIndex(r => r.id === room.id) + 1];
  return (
    <>
      {room.mode && <button className="textBtn" onClick={() => go(room.mode === "hack" ? "hacking" : "course")}>{tr(room.mode === "hack" ? "Взлом" : "Последовательный курс")}</button>}
      {room.mode === "course" && count(p, room.id) === room.lessons.length && <p className="notice" role="status">{tr("Завершено")} · <button className="textBtn" onClick={() => go(nextModule ? "lab/" + nextModule.id : "course")}>{tr(nextModule ? "Продолжить курс" : "Курс завершён")}</button></p>}
      <button onClick={() => go("rooms")} className="back">
        <ArrowLeft size={16} />
        {tr(" Каталог комнат")}
      </button>
      <div className="pageTitle">
        <h1>{tr(room.title)}</h1>
        <p>{tr(room.description)}</p>
      </div>
      {room.id === "mail-trail" && count(p, room.id) === room.lessons.length && (
        <p className="notice" role="status">{tr("Расследование завершено")} · {earnedXP(p.solves.filter(s => s.room === room.id))} XP</p>
      )}
      <div className="labGrid">
        <section className="panel tasks">
          <div className="sectionHead">
            <h2>{tr("Задания")}</h2>
            <span className="mono">
              {count(p, room.id)} / {room.lessons.length}
            </span>
          </div>
          {room.lessons.map((l, i) => {
            const solved = p.solves.find(
                (s) => s.room === room.id && s.task === i,
              ),
              attempt = attemptFor(p, room.id, i),
              hints = l.hints?.length ? l.hints : [l.explanation],
              cmd = l.command + (l.command === "nmap" ? "" : " " + l.file);
            return (
              <div className="task" key={l.file}>
                <button
                  className="taskTitle"
                  disabled={busy || !taskUnlocked(room, i, p.solves)}
                  title={!taskUnlocked(room, i, p.solves) ? tr("Сначала завершите предыдущий этап.") : undefined}
                  aria-expanded={opened === i}
                  onClick={() => {
                    open(opened === i ? -1 : i);
                    setAnswer("");
                    setErr("");
                    copy(false);
                  }}
                >
                  <span className={"step " + (solved ? "ok" : "")}>
                    {solved ? <Check size={15} /> : i + 1}
                  </span>
                  {tr(l.title)}
                  <ChevronDown size={16} />
                </button>
                {opened === i && (
                  <div className="taskBody">
                    {l.theory && <section className="lessonTheory"><h3>{tr("Теория")}</h3><p>{tr(l.theory)}</p></section>}
                    <p>{tr(l.body)}</p>
                    {l.kind && <pre className="evidence">{tr(l.artifact)}</pre>}
                    <div className="snippet">
                      <code>{cmd}</code>
                      <button
                        aria-label={tr("Скопировать команду")}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(cmd);
                            copy(true);
                          } catch {
                            setErr("Выделите команду и скопируйте вручную.");
                          }
                        }}
                      >
                        {copied ? <Check size={15} /> : <Clipboard size={15} />}
                      </button>
                    </div>
                    {!solved && <p className="mono" aria-live="polite">{tr("Награда за решение")}: {reward(attempt)} XP</p>}
                    {!solved && attempt.hints < hints.length && (
                      <button className="textBtn" disabled={busy}
                        aria-controls={"hints-" + i}
                        onClick={async () => {
                          setBusy(true);
                          setErr("");
                          try { await revealHint(room, i, attempt.hints + 1); }
                          catch (error) { setErr((error as Error).message); }
                          finally { setBusy(false); }
                        }}>
                        <Lightbulb size={15} />
                        {tr(attempt.hints ? "Следующая подсказка" : "Подсказка")}
                        {" · "}{attempt.hints + 1} / {hints.length} · −{hintCost} XP
                      </button>
                    )}
                    <div id={"hints-" + i} aria-live="polite">
                      {hints.slice(0, attempt.hints).map((text, index) => (
                        <p className="notice" key={index}>{index + 1}. {tr(text)}</p>
                      ))}
                    </div>
                    {solved ? (
                      <>
                        <div className="solved"><Check size={16} />{tr("Ответ принят")} · {solved.xp ?? taskXP} XP</div>
                        <div className="notice">
                          <h3>{tr("Разбор решения")}</h3>
                          <p>{tr(l.explanation)}</p>
                        </div>
                        {i < room.lessons.length - 1 && (
                          <button className="textBtn" onClick={() => {
                            open(i + 1); setAnswer(""); setErr(""); copy(false);
                          }}>{tr("Следующий этап")}</button>
                        )}
                      </>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (busy) return;
                          setBusy(true);
                          try {
                            await solve(room, i, answer);
                            setErr("");
                          } catch (e) {
                            setErr((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
<Exercise key={l.file} lesson={l} answer={answer} setAnswer={value => {setAnswer(value); setErr("");}} />
                        {error && (
                          <p className="error" role="alert">
                            {tr(error)}
                          </p>
                        )}
                        {attempt.mistakes > 0 && <p className="notice">{tr("Совет")}: {tr(retryTips[l.kind ?? "flag"] ?? retryTips.flag)}</p>}
                        <button className="primary" disabled={busy || !answer}>
                          <Flag size={15} />
                          {tr(l.kind && l.kind !== "flag" && l.kind !== "simulation" ? "Проверьте ответ" : "Отправить флаг")}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
        <section className="labTerminal">
          <header>
            <span>
              <Terminal size={17} />
              {tr(" Учебный терминал")}
            </span>
            <button
              title={tr("Очистить терминал")}
              aria-label={tr("Очистить терминал")}
              onClick={() => log([])}
            >
              <RotateCcw size={15} />
            </button>
          </header>
          <div className="termScroll">
            <p>
              {tr("CyberLime OS · локальная лаборатория")}
              <br />
              {tr("Введите help для справки или ls для списка файлов.")}
            </p>
            {history.map((h, i) => (
              <div key={i}>
                <b>analyst ~ $ </b>
                {h.cmd}
                <pre>{tr(h.out)}</pre>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!line.trim()) return;
                if (line.trim() === "clear") log([]);
                else log((a) => [...a, { cmd: line, out: run(line, room) }]);
                setLine("");
                setPos(-1);
              }}
            >
              <b>analyst ~ $ </b>
              <input
                aria-label={tr("Команда терминала")}
                spellCheck={false}
                autoComplete="off"
                value={line}
                onChange={(e) => setLine(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    ["ArrowUp", "ArrowDown"].includes(e.key) &&
                    history.length
                  ) {
                    e.preventDefault();
                    const n =
                      e.key === "ArrowUp"
                        ? pos < 0
                          ? history.length - 1
                          : Math.max(0, pos - 1)
                        : Math.min(history.length, pos + 1);
                    setPos(n);
                    setLine(history[n]?.cmd || "");
                  }
                }}
              />
            </form>
            <div ref={bottom} />
          </div>
        </section>
      </div>
    </>
  );
}
