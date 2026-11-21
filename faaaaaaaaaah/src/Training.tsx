import { useState } from "react";
import { academyRooms, courseUnlocked, simulate } from "../shared/academy.js";
import { rooms, count, earnedXP, go, type Profile, type Lesson } from "./data";
import { tr } from "./i18n";
import { Card } from "./Dashboard";

export function Training({p, auth, hacking = false}: {p: Profile; auth: () => void; hacking?: boolean}) {
  const chain = academyRooms.map(r => rooms.find(room => room.id === r.id)!);
  const next = chain.find(r => count(p, r.id) < r.lessons.length);
  const total = chain.reduce((sum, r) => sum + r.lessons.length, 0);
  const done = chain.reduce((sum, r) => sum + count(p, r.id), 0);
  const courseXP = earnedXP(p.solves.filter(s => chain.some(room => room.id === s.room)));
  return <>
    <div className="pageTitle">
      <h1>{tr(hacking ? "Взлом" : "Последовательный курс")}</h1>
      <p>{tr(hacking
        ? "Четыре вымышленные цели: исследуйте ошибку, получите флаг, закрепите исправление."
        : "Восемь модулей: от основ защиты до реагирования. Выполняйте уроки и практику по порядку.")}</p>
    </div>
    {hacking ? <>
      <p className="notice">{tr("Локальный симулятор: запросы не отправляются в интернет.")}</p>
      <div className="cards">{rooms.filter(r => r.mode === "hack").map(r => <Card key={r.id} room={r} p={p}/>)}</div>
    </> : <>
      <section className="panel courseSummary">
        <h2>{tr(next ? "Продолжить курс" : "Курс завершён")}</h2>
        <p>{done} / {total} · {courseXP} XP</p>
        <progress value={done} max={total} aria-label={tr("Прогресс")}/>
        {next && <button className="primary" onClick={() => !p.user && next !== chain[0] ? auth() : go("lab/" + next.id)}>
          {tr(!p.user && next !== chain[0] ? "Войти или зарегистрироваться" : next.title)}
        </button>}
      </section>
      <div className="courseModules">{chain.map((r, i) => {
        const unlocked = courseUnlocked(r.id, p.solves);
        const complete = count(p, r.id) === r.lessons.length;
        return <article className="panel courseModule" key={r.id}>
          <span className="step">{complete ? "✓" : i + 1}</span>
          <div><h2>{tr(r.title)}</h2><p>{count(p, r.id)} / {r.lessons.length} · {r.minutes} {tr("мин")}</p>
            {!unlocked && <p>{tr("Сначала завершите предыдущий модуль.")}</p>}</div>
          <button className="primary" disabled={!!p.user && !unlocked} onClick={() => !p.user && i > 0 ? auth() : go("lab/" + r.id)}>
            {tr(!p.user && i > 0 ? "Требуется аккаунт" : complete ? "Завершено" : "Практика")}
          </button>
        </article>;
      })}</div>
    </>}
  </>;
}

export function Exercise({lesson, answer, setAnswer}: {lesson: Lesson; answer: string; setAnswer: (answer: string) => void}) {
  const [order, setOrder] = useState<string[]>([]);
  const [request, setRequest] = useState("");
  const [result, setResult] = useState("");
  if (lesson.kind === "choice") return <fieldset className="exerciseOptions">
    <legend>{tr("Выберите ответ")}</legend>
    {lesson.options?.map(option => <label key={option.value}>
      <input type="radio" name="choice" required checked={answer === `FLAG{${option.value}}`}
        onChange={() => setAnswer(`FLAG{${option.value}}`)}/>{tr(option.label)}
    </label>)}
  </fieldset>;
  if (lesson.kind === "order") return <div className="exerciseOrder">
    <p>{tr("Порядок событий")}</p>
    <div className="orderChoices">{lesson.options?.map(option => <button type="button" key={option.value} disabled={order.includes(option.value)} onClick={() => {
      const next = [...order, option.value]; setOrder(next);
      setAnswer(next.length === lesson.options?.length ? `FLAG{${next.join(",")}}` : "");
    }}>{option.value} · {tr(option.label)}</button>)}</div>
    <p aria-live="polite">{order.join(" → ") || "…"}</p>
    <button type="button" className="textBtn" onClick={() => {setOrder([]); setAnswer("");}}>{tr("Сбросить порядок")}</button>
  </div>;
  return <>
    {lesson.kind === "simulation" && <div className="simulationBox">
      <p>{tr("Локальный симулятор: запросы не отправляются в интернет.")}</p>
      <label>{tr("Запрос к симулятору")}<input value={request} spellCheck={false} onChange={e => setRequest(e.target.value)} placeholder="GET /path"/></label>
      <button type="button" className="textBtn" disabled={!request.trim()} onClick={() => setResult(simulate(lesson.scenario, request))}>{tr("Выполнить запрос")}</button>
      {result && <pre role="status">{result}</pre>}
    </div>}
    <label>{tr(lesson.kind === "fix" ? "Исправленное значение" : "Флаг задания")}
      <input required value={lesson.kind === "fix" ? answer.replace(/^FLAG\{/, "").replace(/\}$/, "") : answer}
        placeholder={lesson.kind === "fix" ? "…" : tr("FLAG{ответ}")}
        onChange={e => setAnswer(lesson.kind === "fix" && e.target.value ? `FLAG{${e.target.value}}` : e.target.value)}/>
    </label>
  </>;
}
