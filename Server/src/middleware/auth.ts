
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

//without this ts was complaining about userId type
declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const token = header.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
