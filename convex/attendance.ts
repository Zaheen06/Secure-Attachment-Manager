import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helpers
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Radius of the earth in km (wait, km? 6371 km = 6371e3 m)
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in m
    return d;
}

export const list = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const attendance = await ctx.db
            .query("attendance")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .collect();

        // Join with student data manually since Convex doesn't have JOINs
        const results = await Promise.all(attendance.map(async (record) => {
            const student = await ctx.db.get(record.studentId);
            return { ...record, student };
        }));
        return results;
    }
});

export const mark = mutation({
    args: {
        studentId: v.id("users"),
        sessionId: v.id("sessions"),
        qrToken: v.string(),
        location: v.object({ lat: v.number(), lng: v.number() }),
        deviceFingerprint: v.string(),
        ipAddress: v.string(), // normally ctx.ip but Convex Cloud limits this
    },
    handler: async (ctx, args) => {
        // 1. Session Valid
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Invalid session");

        // 2. QR Valid
        if (session.currentQrCode !== args.qrToken) {
            throw new Error("Invalid or expired QR code");
        }
        if (session.currentQrExpiresAt! < Date.now()) {
            throw new Error("QR code expired");
        }

        // 3. Mark check
        const existing = await ctx.db
            .query("attendance")
            .withIndex("by_student_and_session", q => q.eq("studentId", args.studentId).eq("sessionId", args.sessionId))
            .first();

        if (existing) {
            throw new Error("Attendance already marked");
        }

        // 3.5 Device Level Session check
        const deviceUsedInSession = await ctx.db
            .query("attendance")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .filter((q) => q.eq(q.field("deviceFingerprint"), args.deviceFingerprint))
            .first();

        if (deviceUsedInSession && deviceUsedInSession.studentId !== args.studentId) {
            throw new Error("This physical device has already been used to mark another student's attendance for this session! No cheating! 😉");
        }

        // 4. Device Registration check
        const user = await ctx.db.get(args.studentId);
        if (!user) throw new Error("User not found");

        if (user.deviceFingerprint && user.deviceFingerprint !== args.deviceFingerprint) {
            throw new Error("Device mismatch. Please use your originally registered device.");
        }

        if (!user.deviceFingerprint) {
            // Make sure this device isn't already assigned to another user globally
            const existingDeviceUser = await ctx.db
                .query("users")
                .filter(q => q.eq(q.field("deviceFingerprint"), args.deviceFingerprint))
                .first();

            if (existingDeviceUser && existingDeviceUser._id !== args.studentId) {
                throw new Error("This device is already permanently registered to another student account.");
            }

            await ctx.db.patch(args.studentId, { deviceFingerprint: args.deviceFingerprint });
        }

        // 5. Geofence
        if (session.locationLat && session.locationLng) {
            const dist = getDistanceFromLatLonInM(args.location.lat, args.location.lng, session.locationLat, session.locationLng);
            if (dist > (session.radius || 200)) {
                throw new Error(`You are too far from the classroom (${Math.round(dist)}m).`);
            }
        }

        // 6. Record
        return await ctx.db.insert("attendance", {
            studentId: args.studentId,
            sessionId: args.sessionId,
            timestamp: Date.now(),
            ipAddress: args.ipAddress,
            deviceFingerprint: args.deviceFingerprint,
            locationLat: args.location.lat,
            locationLng: args.location.lng,
            verified: true
        });
    }
});
