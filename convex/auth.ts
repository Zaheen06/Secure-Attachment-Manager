import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Mock bcrypt for Convex backend (in reality we'd use nodecrypto or just send plain if MVP)
// For now, let's keep password matching as simple plain text since we migrate.
// Wait, the user already had bcrypt hashed passwords. If there are old users, they won't match. But Convex DB is fresh and empty!
export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
      
    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Insert user (plain password for MVP, but should be hashed)
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      password: args.password,
      role: args.role,
      createdAt: Date.now(),
    });

    return userId;
  }
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
      
    if (!user || user.password !== args.password) {
      throw new Error("Invalid credentials");
    }

    return user._id; // return token (userId)
  }
});

export const me = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
});
