import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { randomUUID } from "crypto";

export const create = mutation({
    args: {
        teacherId: v.id("users"),
        subject: v.string(),
        startTime: v.number(),
        endTime: v.optional(v.number()),
        locationLat: v.optional(v.number()),
        locationLng: v.optional(v.number()),
        radius: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // Add default mock location for MVP if not given
        const CAMPUS_CENTER = { lat: 40.7128, lng: -74.0060 };
        const CAMPUS_RADIUS_METERS = 200;

        const sessionId = await ctx.db.insert("sessions", {
            teacherId: args.teacherId,
            subject: args.subject,
            startTime: args.startTime,
            endTime: args.endTime,
            isActive: true,
            locationLat: args.locationLat || CAMPUS_CENTER.lat,
            locationLng: args.locationLng || CAMPUS_CENTER.lng,
            radius: args.radius || CAMPUS_RADIUS_METERS,
        });
        return ctx.db.get(sessionId);
    }
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("sessions").collect();
    }
});

export const get = query({
    args: { id: v.optional(v.id("sessions")) },
    handler: async (ctx, args) => {
        if (!args.id) return null;
        return await ctx.db.get(args.id);
    }
});

export const generateQr = mutation({
    args: {
        sessionId: v.id("sessions"),
        teacherId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.teacherId !== args.teacherId) throw new Error("Not your session");

        // Random non-crypto nonce since we can't easily rely on jwt here
        const qrToken = `qr-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const expiresAt = Date.now() + 30 * 1000; // 30 sec TTL

        await ctx.db.patch(args.sessionId, {
            currentQrCode: qrToken,
            currentQrExpiresAt: expiresAt
        });

        return { token: qrToken, expiresAt };
    }
});
