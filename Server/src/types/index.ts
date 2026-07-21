
import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2).max(50),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
