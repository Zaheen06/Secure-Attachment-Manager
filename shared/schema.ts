import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["student", "teacher", "admin"] }).notNull().default("student"),
  deviceFingerprint: text("device_fingerprint"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  subject: text("subject").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  isActive: boolean("is_active").default(true),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  radius: integer("radius").default(100), // meters
  currentQrCode: text("current_qr_code"), // Store current valid QR hash/nonce
  currentQrExpiresAt: timestamp("current_qr_expires_at"),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  sessionId: integer("session_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: text("ip_address"),
  deviceFingerprint: text("device_fingerprint"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  verified: boolean("verified").default(false),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Can be null if unknown
  action: text("action").notNull(),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
  details: jsonb("details"),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  attendance: many(attendance),
  auditLogs: many(auditLogs),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  teacher: one(users, {
    fields: [sessions.teacherId],
    references: [users.id],
  }),
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [attendance.sessionId],
    references: [sessions.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, currentQrCode: true, currentQrExpiresAt: true, teacherId: true }).extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
});
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, timestamp: true, verified: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// === API CONTRACT TYPES ===

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type GenerateQrRequest = {
  sessionId: number;
};

export type QrResponse = {
  token: string;
  expiresAt: string; // ISO string
};

export type MarkAttendanceRequest = {
  sessionId: number;
  qrToken: string;
  location: { lat: number; lng: number };
  deviceFingerprint: string;
};

export type SessionStats = {
  totalStudents: number;
  presentCount: number;
  recentScans: Attendance[];
};
