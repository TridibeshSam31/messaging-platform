// src/config/cors.ts
import { CorsOptions } from "cors";
import { env } from "./env.js";

export const corsOptions: CorsOptions = {
  // Only allow request origins defined in your validated env configuration
  origin: env?.CLIENT_URL ?? "",
  
  // Required to allow the frontend to receive and send the httpOnly refresh token cookie
  credentials: true,
  
  // Allowed HTTP verbs for API interactions
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  
  // Headers that client requests are permitted to include (e.g. Authorization header for Access Tokens)
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  
  // How long the browser should cache the preflight (OPTIONS) request results
  maxAge: 86400, // 24 hours
};
