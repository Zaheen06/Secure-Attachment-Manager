import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";
const SALT_ROUNDS = 10;
const QR_TTL_SECONDS = 30;

// Campus Location (Mock - Center of a hypothetical campus)
// Example: New York City Hall
const CAMPUS_CENTER = { lat: 40.7128, lng: -74.0060 };
const CAMPUS_RADIUS_METERS = 200; // 200 meters allowed

// Mock Campus IP Range (Allow localhost for dev)
const ALLOWED_IPS = ["127.0.0.1", "::1"]; // Add real campus IPs here

// Haversine formula to calculate distance in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d; // meters since R is 6371e3 meters? No wait, 6371 km is 6371e3 m. Yes.
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === AUTH ===
  
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // === SESSIONS ===

  app.post(api.sessions.create.path, authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Only teachers can create sessions" });
    }
    try {
      const input = api.sessions.create.input.parse(req.body);
      const session = await storage.createSession({ 
        ...input, 
        teacherId: req.user.id,
        // Set default location if not provided (for MVP)
        locationLat: input.locationLat || CAMPUS_CENTER.lat,
        locationLng: input.locationLng || CAMPUS_CENTER.lng,
        radius: input.radius || CAMPUS_RADIUS_METERS
      });
      res.status(201).json(session);
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.log("Validation error:", JSON.stringify(err.errors, null, 2));
            return res.status(400).json({ message: err.errors[0].message, details: err.errors });
        }
      console.error(err);
      res.status(500).json({ message: "Error creating session" });
    }
  });

  app.get(api.sessions.list.path, authenticateToken, async (req, res) => {
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.get(api.sessions.get.path, authenticateToken, async (req, res) => {
    const session = await storage.getSession(Number(req.params.id));
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  });

  app.post(api.sessions.generateQr.path, authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.teacherId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not your session" });
    }

    // Generate QR Token
    const nonce = randomUUID();
    const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);
    
    // Hash/Sign the token to prevent tampering (simple version: just store nonce)
    // In production, we might sign this with JWT_SECRET too, but storing in DB is safer for replay prevention
    const qrToken = jwt.sign({ sessionId, nonce }, JWT_SECRET, { expiresIn: QR_TTL_SECONDS });

    await storage.updateSessionQr(sessionId, qrToken, expiresAt);

    res.json({ token: qrToken, expiresAt: expiresAt.toISOString() });
  });

  // === ATTENDANCE ===

  app.post(api.attendance.mark.path, authenticateToken, async (req: any, res) => {
    try {
      const { sessionId, qrToken, location, deviceFingerprint } = req.body;
      const studentId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // 1. Validate Session & QR
      const session = await storage.getSession(sessionId);
      if (!session) {
          await storage.createAuditLog({ userId: studentId, action: "ATTENDANCE_FAILED", reason: "Invalid session", ipAddress });
          return res.status(400).json({ message: "Invalid session" });
      }

      if (session.currentQrCode !== qrToken) {
          await storage.createAuditLog({ userId: studentId, action: "ATTENDANCE_FAILED", reason: "Invalid QR Token", ipAddress });
          return res.status(400).json({ message: "Invalid or expired QR code" });
      }

      if (new Date() > new Date(session.currentQrExpiresAt!)) {
          await storage.createAuditLog({ userId: studentId, action: "ATTENDANCE_FAILED", reason: "Expired QR Token", ipAddress });
          return res.status(400).json({ message: "QR code expired" });
      }

      // 2. Validate Already Marked
      const existingRecord = await storage.getAttendance(studentId, sessionId);
      if (existingRecord) {
        return res.status(400).json({ message: "Attendance already marked" });
      }

      // 3. Validate Device Binding
      const user = await storage.getUser(studentId);
      if (user?.deviceFingerprint && user.deviceFingerprint !== deviceFingerprint) {
        await storage.createAuditLog({ userId: studentId, action: "ATTENDANCE_FAILED", reason: "Device Mismatch", ipAddress, details: { registered: user.deviceFingerprint, current: deviceFingerprint } });
        return res.status(403).json({ message: "Device mismatch. Please use your registered device." });
      }
      
      // Bind device if first time
      if (!user?.deviceFingerprint) {
        await storage.updateUserFingerprint(studentId, deviceFingerprint);
      }

      // 4. Validate Location (Geofencing)
      if (session.locationLat && session.locationLng) {
        const distance = getDistanceFromLatLonInM(
          location.lat, location.lng,
          session.locationLat, session.locationLng
        );
        
        if (distance > (session.radius || CAMPUS_RADIUS_METERS)) {
            await storage.createAuditLog({ userId: studentId, action: "ATTENDANCE_FAILED", reason: "Location mismatch", ipAddress, details: { distance, allowed: session.radius } });
            return res.status(400).json({ message: `You are too far from the classroom (${Math.round(distance)}m).` });
        }
      }

      // 5. Validate IP (Optional - simplistic check)
      // In production, use CIDR matching
      /*
      if (!ALLOWED_IPS.includes(ipAddress)) {
         // await storage.createAuditLog(...)
         // return res.status(403).json({ message: "Must be on campus WiFi" });
      }
      */

      // 6. Mark Attendance
      const record = await storage.markAttendance({
        studentId,
        sessionId,
        ipAddress: String(ipAddress),
        deviceFingerprint,
        locationLat: location.lat,
        locationLng: location.lng,
        verified: true
      });

      await storage.createAuditLog({ userId: studentId, action: "ATTENDANCE_MARKED", ipAddress });

      res.json({ message: "Attendance marked successfully", record });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.attendance.list.path, authenticateToken, async (req: any, res) => {
    // Only teacher of session or admin
    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.teacherId !== req.user.id && req.user.role !== 'admin') {
       return res.status(403).json({ message: "Unauthorized" });
    }

    const records = await storage.getSessionAttendance(sessionId);
    res.json(records);
  });

  return httpServer;
}
