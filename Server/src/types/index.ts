
import { z } from "zod";
import { MessageType } from "@prisma/client";

export const signupSchema = z.object({
  name: z.string().min(2).max(50),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
});


export const sendMessageSchema = z.object({
  type: z.nativeEnum(MessageType),
  content: z.string().optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    mimeType: z.string(),
    size: z.number(),
    fileName: z.string().optional(),
  })).optional(),
});


export const createConvSchema = z.object({
  type: z.enum(["PRIVATE", "GROUP"]),
  otherUserId: z.string().optional(), // For PRIVATE
  name: z.string().min(3).optional(), // For GROUP
  memberIds: z.array(z.string()).optional(), // For GROUP
});

