import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text(),
  google_picture: text(),
  avatar: text(),
  last_room: text().notNull().default("linux"),
});
export const sessions = sqliteTable("sessions", {
  digest: text().primaryKey(),
  user_id: text()
    .notNull()
    .references(() => users.id),
  expires: integer().notNull(),
});
export const challenges = sqliteTable("challenges", {
  nonce: text().primaryKey(),
  expires: integer().notNull(),
});
export const solves = sqliteTable(
  "solves",
  {
    user_id: text()
      .notNull()
      .references(() => users.id),
    room: text().notNull(),
    task: integer().notNull(),
    day: text().notNull(),
    xp: integer().notNull().default(150),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.room, t.task] })],
);
export const taskAttempts = sqliteTable("task_attempts", {
  user_id: text().notNull().references(() => users.id, { onDelete: "cascade" }),
  room: text().notNull(),
  task: integer().notNull(),
  mistakes: integer().notNull().default(0),
  hints: integer().notNull().default(0),
}, (t) => [primaryKey({ columns: [t.user_id, t.room, t.task] })]);
