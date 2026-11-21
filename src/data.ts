import {
  activitySummary,
  studyDay,
  shiftDay,
  stripDemoSolves,
} from "../shared/activity.js";
import { rooms as curriculum } from "../shared/course.js";
import { taskXP } from "../shared/rewards.js";
export interface Lesson {
  title: string;
  body: string;
  file: string;
  artifact: string;
  value: string;
  explanation: string;
  hints?: string[];
  theory?: string;
  kind?: string;
  scenario?: string;
  options?: {value: string; label: string}[];
  command: string;
}
export interface Room {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  minutes: number;
  rating: string;
  cover: string;
  description: string;
  lessons: Lesson[];
  mode?: string;
  sequential?: boolean;
}
export interface Solve {
  room: string;
  task: number;
  day: string;
  xp?: number;
}
export interface TaskAttempt { room: string; task: number; mistakes: number; hints: number }
export const themeLabels = { system: "Как на устройстве", light: "Светлая тема", dark: "Тёмная тема" } as const;
export type ThemeMode = keyof typeof themeLabels;
export interface Profile {
  user: { name: string; email?: string | null; picture?: string | null; googlePicture?: string | null; provider?: "Google" | "GitHub" } | null;
  last: string;
  solves: Solve[];
  attempts?: TaskAttempt[];
}
export const attemptFor = (p: Profile, room: string, task: number) =>
  p.attempts?.find(a => a.room === room && a.task === task) ?? { room, task, mistakes: 0, hints: 0 };
export const rooms = curriculum as Room[];
export const dateKey = (date: Date) => studyDay(date);
export const daysAgo = (n: number) => shiftDay(studyDay(), -n);
export const names: Record<string, string> = {
  Easy: "Легко",
  Medium: "Средне",
  Hard: "Сложно",
  Insane: "Эксперт",
  Web: "Web",
  Network: "Сети",
  Cryptography: "Криптография",
  Linux: "Linux",
  OSINT: "OSINT",
  Forensics: "Форензика",
};
export const paths = [
  {
    title: "Основы кибербезопасности",
    desc: "От первого терминала до проверки сетевых событий.",
    ids: ["linux", "headers", "traffic"],
    color: "green",
  },
  {
    title: "Безопасность веб-приложений",
    desc: "Разбор ответов сервера, кодировок и цифровых следов.",
    ids: ["headers", "crypto", "forensics"],
    color: "amber",
  },
  {
    title: "OSINT и проверка источников",
    desc: "Проверка публикаций и происхождения файлов.",
    ids: ["sources", "forensics"],
    color: "purple",
  },
  {
    title: "Анализ трафика и SOC",
    desc: "Работа с сетевой телеметрией и оценка оповещений.",
    ids: ["traffic", "alerts", "forensics"],
    color: "purple",
  },
  {
    title: "Безопасность Linux",
    desc: "Права доступа, журналы и восстановление данных.",
    ids: ["linux", "alerts", "recovery"],
    color: "green",
  },
];
export const count = (p: Profile, id: string) =>
  p.solves.filter((s) => s.room === id).length;
export const complete = (p: Profile) =>
  rooms.filter((r) => count(p, r.id) === r.lessons.length);
export const earnedXP = (solves: Solve[]) => solves.reduce((total, solve) => total + (solve.xp ?? taskXP), 0);
export const xp = (p: Profile) => earnedXP(p.solves);
export function rank(p: Profile) {
  const level = Math.floor(xp(p) / 600) + 1;
  return {
    level,
    title: ["Стажёр", "Аналитик", "Специалист", "Эксперт"][
      Math.min(level - 1, 3)
    ],
    code: "0x" + level.toString(16).padStart(2, "0"),
    next: level * 600,
  };
}
export function guest(): Profile {
  try {
    const saved = localStorage.getItem("cyberlime.guest.v2");
    const legacy = !saved;
    const p = JSON.parse(
      saved ?? localStorage.getItem("cyberlime.guest.v1") ?? "null",
    );
    if (p && Array.isArray(p.solves) && rooms.some((r) => r.id === p.last)) {
      return {
        user: null,
        last: p.last,
        solves: legacy ? stripDemoSolves(p.solves) : p.solves,
        attempts: Array.isArray(p.attempts) ? p.attempts : [],
      };
    }
  } catch {}
  return { user: null, last: "linux", solves: [] };
}
export class ApiError extends Error {
  constructor(message: string, public profile?: Profile) { super(message); }
}
export async function api<T = any>(path: string, data?: unknown): Promise<T> {
  const r = await fetch(
    "/api/" + path,
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const body = await r.json();
  if (!r.ok) throw new ApiError(body.error || "Ошибка соединения", body.profile);
  return body;
}
export const go = (hash: string) => {
  location.hash = hash;
};
export const records = [
  ["HexaFox", "Грузия", 5680, 32],
  ["nullbyte", "Казахстан", 5240, 29],
  ["AdaTrace", "Армения", 4970, 27],
  ["bytewave", "Россия", 3720, 21],
  ["PacketCat", "Азербайджан", 2830, 16],
  ["LogSmith", "Кыргызстан", 1860, 11],
  ["NordKey", "Россия", 910, 6],
] as const;
export function board(p: Profile, month = false) {
  const key = dateKey(new Date()).slice(0, 7);
  return [
    ...records.map(([name, country, x, solved], i) => ({
      name,
      country,
      points: month ? Math.floor(x * (i % 2 ? 0.39 : 0.3)) : x,
      solved: month ? Math.ceil(solved / 3) : solved,
      me: false,
    })),
    {
      name: p.user?.name || "Оператор",
      country: "—",
      points: month
        ? earnedXP(p.solves.filter((s) => s.day.startsWith(key)))
        : xp(p),
      solved: month
        ? complete(p).filter((r) =>
            p.solves
              .filter((s) => s.room === r.id)
              .map((s) => s.day)
              .sort()
              .at(-1)
              ?.startsWith(key),
          ).length
        : complete(p).length,
      me: true,
    },
  ].sort((a, b) => b.points - a.points);
}
export const achievements = (p: Profile) => [
  {
    name: "Первый флаг",
    condition: "Решите первое задание",
    earned: p.solves.length > 0,
  },
  {
    name: "Следопыт",
    condition: "Завершите комнату по OSINT",
    earned: complete(p).some((r) => r.category === "OSINT"),
  },
  {
    name: "В ударе",
    condition: "Занимайтесь семь дней подряд",
    earned: activitySummary(p.solves).best >= 7,
  },
  {
    name: "Хранитель",
    condition: "Проверьте резервную копию",
    earned: complete(p).some((r) => r.id === "recovery"),
  },
];
