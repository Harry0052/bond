import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  timezone: text("timezone").notNull(),
  kind: text("kind").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const securityEvents = sqliteTable(
  "security_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    kind: text("kind").notNull(),
    metadataJson: text("metadata_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("security_events_user_idx").on(table.userId, table.createdAt)],
);

export const rateBuckets = sqliteTable("rate_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  windowStart: text("window_start").notNull(),
  count: integer("count").notNull(),
});

export const bonds = sqliteTable(
  "bonds",
  {
    id: text("id").primaryKey(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    purpose: text("purpose").notNull(),
    status: text("status").notNull(),
    shareTokenHash: text("share_token_hash").notNull().unique(),
    shareNonce: text("share_nonce").notNull(),
    demo: integer("demo").notNull().default(0),
    idempotencyKey: text("idempotency_key"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("bonds_creator_idx").on(table.creatorId, table.createdAt)],
);

export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey(),
    bondId: text("bond_id")
      .notNull()
      .references(() => bonds.id),
    userId: text("user_id").references(() => users.id),
    invitedName: text("invited_name").notNull(),
    invitationStatus: text("invitation_status").notNull(),
    role: text("role").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("members_bond_idx").on(table.bondId, table.invitationStatus),
    index("members_user_idx").on(table.userId, table.invitationStatus),
  ],
);

export const commitments = sqliteTable(
  "commitments",
  {
    id: text("id").primaryKey(),
    bondId: text("bond_id")
      .notNull()
      .references(() => bonds.id),
    assignedMemberId: text("assigned_member_id").references(() => members.id),
    title: text("title").notNull(),
    dueAt: text("due_at").notNull(),
    status: text("status").notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("commitments_bond_idx").on(table.bondId, table.dueAt)],
);

export const acceptances = sqliteTable(
  "acceptances",
  {
    id: text("id").primaryKey(),
    commitmentId: text("commitment_id")
      .notNull()
      .references(() => commitments.id),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    revision: integer("revision").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("acceptances_once_idx").on(table.commitmentId, table.memberId, table.revision)],
);

export const voteQuestions = sqliteTable("vote_questions", {
  id: text("id").primaryKey(),
  bondId: text("bond_id")
    .notNull()
    .references(() => bonds.id),
  prompt: text("prompt").notNull(),
  createdAt: text("created_at").notNull(),
});

export const decisions = sqliteTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    bondId: text("bond_id")
      .notNull()
      .references(() => bonds.id),
    questionId: text("question_id")
      .notNull()
      .references(() => voteQuestions.id),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    vote: text("vote").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("decisions_once_idx").on(table.questionId, table.memberId),
    index("decisions_bond_idx").on(table.bondId, table.createdAt),
  ],
);

export const bondEvents = sqliteTable(
  "bond_events",
  {
    id: text("id").primaryKey(),
    bondId: text("bond_id")
      .notNull()
      .references(() => bonds.id),
    actorId: text("actor_id"),
    eventType: text("event_type").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("bond_events_bond_idx").on(table.bondId, table.createdAt)],
);
