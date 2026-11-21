import { academyCopy } from "../shared/academy.js";
import { investigationCopy } from "../shared/investigation.js";
import { useSyncExternalStore } from "react";
import { courseCopy } from "./course-copy";
import { uiCopy } from "./ui-copy";
export type Language = "ru" | "en" | "az";
export const languages = {
  ru: "Русский",
  en: "English",
  az: "Azərbaycanca",
} as const;
const key = "cyberlime.language";
const valid = (value: string | null): Language =>
  value === "en" || value === "az" ? value : "ru";
let active = valid(localStorage.getItem(key));
const listeners = new Set<() => void>();
export const locale = () => active;
function apply(language: Language) {
  active = language;
  document.documentElement.lang = active;
  listeners.forEach((listener) => listener());
}
apply(active);
window.addEventListener("storage", (event) => {
  if (event.key === key || event.key === null) apply(valid(event.newValue));
});
export function setLanguage(language: Language) {
  localStorage.setItem(key, language);
  apply(language);
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useLanguage = () => useSyncExternalStore(subscribe, locale);
const copy = new Map(Object.entries({ ...courseCopy, ...uiCopy, ...investigationCopy, ...academyCopy }));
export function tr(source: string) {
  if (active === "ru") return source;
  const key = source.trim();
  const entry = copy.get(source) ?? copy.get(key);
  if (!entry) return source;
  const output = entry[active === "en" ? 0 : 1];
  return copy.has(source) ? output : source.replace(key, () => output);
}
export const searchable = (words: string[], query: string) =>
  words
    .flatMap((word) => [word, tr(word)])
    .join(" ")
    .normalize("NFC")
    .toLocaleLowerCase(active)
    .includes(
      query.replace(/^#/, "").trim().normalize("NFC").toLocaleLowerCase(active),
    );

const azMonths = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const azShortMonths = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
const azWeekdays = ["B.", "B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş."];
// Some embedded browsers have partial ICU data and produce placeholders such as M11.
export function calendarFormat(options: Intl.DateTimeFormatOptions) {
  if (locale() !== "az") return new Intl.DateTimeFormat(locale(), options);
  return {format(date: Date) {
    const utc = options.timeZone === "UTC";
    const day = utc ? date.getUTCDate() : date.getDate();
    const month = utc ? date.getUTCMonth() : date.getMonth();
    const year = utc ? date.getUTCFullYear() : date.getFullYear();
    if (options.weekday) return azWeekdays[utc ? date.getUTCDay() : date.getDay()];
    if (!options.month) return [String(day).padStart(2,"0"),String(month+1).padStart(2,"0"),year].join(".");
    const monthName = (options.month === "long" ? azMonths : azShortMonths)[month];
    return [options.day ? String(day) : "", monthName, options.year ? String(year) : ""].filter(Boolean).join(" ");
  }};
}
