import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Voters table (identity lock table)
export const voters = pgTable("voters", {
  id: uuid("id").defaultRandom().primaryKey(),

  matricNo: varchar("matric_no", { length: 50 }).notNull().unique(),

  biometricHash: varchar("biometric_hash", { length: 255 }),
  biometricType: varchar("biometric_type", { length: 20 }).default("none"), // face | fingerprint | none

  deviceId: varchar("device_id", { length: 255 }), // fallback identity
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow(),
});

// Elections table
export const elections = pgTable("elections", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status", { length: 20 }).default("upcoming"),
});

// Positions
export const positions = pgTable("positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  electionId: uuid("election_id").references(() => elections.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 100 }).notNull(),
});

// Candidates
export const candidates = pgTable("candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  positionId: uuid("position_id").references(() => positions.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 150 }).notNull(),
  photo: text("photo"), // Cloudinary URL
  photoPublicId: varchar("photo_public_id", { length: 255 }), // Cloudinary public_id
  manifesto: text("manifesto"),
});

// Votes table
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    matricNo: varchar("matric_no", { length: 50 }).notNull(),

    biometricHash: varchar("biometric_hash", { length: 255 }),
    biometricType: varchar("biometric_type", { length: 20 }).default("none"),

    deviceId: varchar("device_id", { length: 255 }),

    candidateId: uuid("candidate_id").references(() => candidates.id),
    positionId: uuid("position_id").references(() => positions.id),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // One vote per matric per position
    uniqueVote: uniqueIndex("unique_vote").on(table.matricNo, table.positionId),

    // One vote per biometric per position (NULL-safe)
    uniqueBiometric: uniqueIndex("unique_biometric").on(
      table.biometricHash,
      table.positionId,
    ),
  }),
);

// Abuse logs table
export const abuseLogs = pgTable("abuse_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  matricNo: varchar("matric_no", { length: 50 }),
  biometricHash: varchar("biometric_hash", { length: 255 }),
  biometricType: varchar("biometric_type", { length: 20 }),
  deviceId: varchar("device_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  action: varchar("action", { length: 100 }),
  occurredAt: timestamp("occurred_at").defaultNow(),
});

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(), // bcrypt hash

  role: varchar("role", { length: 50 }).default("admin"), // admin | superadmin | moderator

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
