import { z } from 'zod';
import { insertUserSchema, insertSessionSchema, insertAttendanceSchema, users, sessions, attendance, auditLogs } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        email: z.string().email(),
        password: z.string(),
      }),
      responses: {
        200: z.object({
          user: z.custom<typeof users.$inferSelect>(),
          token: z.string(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  sessions: {
    create: {
      method: 'POST' as const,
      path: '/api/sessions' as const,
      input: insertSessionSchema,
      responses: {
        201: z.custom<typeof sessions.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/sessions' as const,
      responses: {
        200: z.array(z.custom<typeof sessions.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sessions/:id' as const,
      responses: {
        200: z.custom<typeof sessions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    generateQr: {
      method: 'POST' as const,
      path: '/api/sessions/:id/qr' as const,
      responses: {
        200: z.object({
          token: z.string(),
          expiresAt: z.string(),
        }),
        403: errorSchemas.forbidden,
      },
    },
  },
  attendance: {
    mark: {
      method: 'POST' as const,
      path: '/api/attendance/mark' as const,
      input: z.object({
        sessionId: z.number(),
        qrToken: z.string(),
        location: z.object({
          lat: z.number(),
          lng: z.number(),
        }),
        deviceFingerprint: z.string(),
      }),
      responses: {
        200: z.object({
          message: z.string(),
          record: z.custom<typeof attendance.$inferSelect>(),
        }),
        400: errorSchemas.validation, // Invalid QR, location, etc.
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/sessions/:id/attendance' as const,
      responses: {
        200: z.array(z.custom<typeof attendance.$inferSelect & { student: typeof users.$inferSelect }>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
