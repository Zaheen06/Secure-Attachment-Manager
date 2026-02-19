import { db } from "./db";
import {
  users, sessions, attendance, auditLogs,
  type User, type InsertUser, type Session, type InsertSession,
  type Attendance, type InsertAttendance, type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserFingerprint(userId: number, fingerprint: string): Promise<User>;

  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  getSessions(): Promise<Session[]>; // Should probably filter by teacher or active
  updateSessionQr(id: number, qrCode: string, expiresAt: Date): Promise<Session>;
  
  // Attendance
  markAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendance(studentId: number, sessionId: number): Promise<Attendance | undefined>;
  getSessionAttendance(sessionId: number): Promise<(Attendance & { student: User })[]>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUserFingerprint(userId: number, fingerprint: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ deviceFingerprint: fingerprint })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async getSessions(): Promise<Session[]> {
    return await db.select().from(sessions);
  }

  async updateSessionQr(id: number, qrCode: string, expiresAt: Date): Promise<Session> {
    const [session] = await db.update(sessions)
      .set({ currentQrCode: qrCode, currentQrExpiresAt: expiresAt })
      .where(eq(sessions.id, id))
      .returning();
    return session;
  }

  async markAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [record] = await db.insert(attendance).values(insertAttendance).returning();
    return record;
  }

  async getAttendance(studentId: number, sessionId: number): Promise<Attendance | undefined> {
    const [record] = await db.select().from(attendance).where(
      and(
        eq(attendance.studentId, studentId),
        eq(attendance.sessionId, sessionId)
      )
    );
    return record;
  }

  async getSessionAttendance(sessionId: number): Promise<(Attendance & { student: User })[]> {
    const records = await db.select().from(attendance)
      .where(eq(attendance.sessionId, sessionId))
      .leftJoin(users, eq(attendance.studentId, users.id));
      
    // Type casting/assertion since leftJoin returns { attendance: ..., users: ... }
    return records.map(r => ({ ...r.attendance!, student: r.users! }));
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
