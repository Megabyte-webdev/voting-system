import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  matricNo: varchar("matric_no", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 150 }).unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).default("student"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const elections = pgTable("elections", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status", { length: 20 }).default("upcoming"),
});

export const positions = pgTable("positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  electionId: uuid("election_id").references(() => elections.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 100 }).notNull(),
});

export const candidates = pgTable("candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  positionId: uuid("position_id").references(() => positions.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 150 }).notNull(),
  photo: text("photo"),
  manifesto: text("manifesto"),
});

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    candidateId: uuid("candidate_id").references(() => candidates.id),
    positionId: uuid("position_id").references(() => positions.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueVote: uniqueIndex("unique_vote").on(table.userId, table.positionId),
  }),
);
