import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");
  
  // Create Admin
  const adminEmail = "admin@campus.edu";
  let admin = await storage.getUserByEmail(adminEmail);
  if (!admin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    admin = await storage.createUser({
      name: "Admin User",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      deviceFingerprint: null
    });
    console.log("Admin created");
  }

  // Create Teacher
  const teacherEmail = "teacher@campus.edu";
  let teacher = await storage.getUserByEmail(teacherEmail);
  if (!teacher) {
    const hashedPassword = await bcrypt.hash("teacher123", 10);
    teacher = await storage.createUser({
      name: "John Doe",
      email: teacherEmail,
      password: hashedPassword,
      role: "teacher",
      deviceFingerprint: null
    });
    console.log("Teacher created");
  }

  // Create Student
  const studentEmail = "student@campus.edu";
  let student = await storage.getUserByEmail(studentEmail);
  if (!student) {
    const hashedPassword = await bcrypt.hash("student123", 10);
    student = await storage.createUser({
      name: "Jane Smith",
      email: studentEmail,
      password: hashedPassword,
      role: "student",
      deviceFingerprint: null
    });
    console.log("Student created");
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
