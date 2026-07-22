
import jwt from "jsonwebtoken";

export const signAccessToken = (userId: string) =>
  jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "15m" });

export const signRefreshToken = (userId: string) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string };


export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
//access token will be stored in the memory i.e zustand etc so that if user refreshes it vanish and then 
//user has to login again
//and refresh token will be stored in httpOnly Cookie 