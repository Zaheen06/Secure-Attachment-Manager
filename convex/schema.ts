import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // 1. Users Table
    users: defineTable({
        name: v.string(),
        email: v.string(),
        password: v.string(), // Note: password hash
        role: v.union(v.literal("student"), v.literal("teacher"), v.literal("admin")),
        deviceFingerprint: v.optional(v.string()),
        createdAt: v.number(), // Use Date.now() for timestamps
    }).index("by_email", ["email"]),

    // 2. Sessions Table
    sessions: defineTable({
        teacherId: v.id("users"), // Foreign key to users table
        subject: v.string(),
        startTime: v.number(),
        endTime: v.optional(v.number()),
        isActive: v.boolean(),
        locationLat: v.optional(v.number()),
        locationLng: v.optional(v.number()),
        radius: v.optional(v.number()), // meters
        currentQrCode: v.optional(v.string()),
        currentQrExpiresAt: v.optional(v.number()),
    }).index("by_teacher", ["teacherId"]),

    // 3. Attendance Table
    attendance: defineTable({
        studentId: v.id("users"), // Foreign key to users
        sessionId: v.id("sessions"), // Foreign key to sessions
        timestamp: v.number(),
        ipAddress: v.optional(v.string()),
        deviceFingerprint: v.optional(v.string()),
        locationLat: v.optional(v.number()),
        locationLng: v.optional(v.number()),
        verified: v.boolean(),
    })
        .index("by_student_and_session", ["studentId", "sessionId"])
        .index("by_session", ["sessionId"]),

    // 4. Audit Logs Table
    auditLogs: defineTable({
        userId: v.optional(v.id("users")),
        action: v.string(),
        reason: v.optional(v.string()),
        ipAddress: v.optional(v.string()),
        timestamp: v.number(),
        details: v.optional(v.any()), // Equivalent to jsonb or details object
    }).index("by_user", ["userId"]),
});
