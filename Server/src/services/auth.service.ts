import bcrypt from "bcrypt"
import { z } from "zod"
import {signAccessToken , signRefreshToken , verifyRefreshToken} from "../lib/jwt.js"
import {AppError} from "../middleware/errorHandler.js"
import { signupSchema , loginSchema } from "../types/index.js"
import {prisma} from "../lib/prisma.js"

export class AuthService{
    static async SignUp(data: z.infer<typeof signupSchema>){

        const{name,username,password} = data

        const existingUser = await prisma.user.findUnique({
            where:{
                username
            }
        })

        if (existingUser){
          throw new AppError(409, "Username already taken");
        }

        const hashedPassword = await bcrypt.hash(password,10)

        const user = await prisma.user.create({
        data: {
        name,
        username,
        password: hashedPassword,
        status: "OFFLINE",
        },
       select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        status: true,
        },
     });

        const accessToken = signAccessToken(user.id);
        const refreshToken = signRefreshToken(user.id);
        return { user, accessToken, refreshToken };


    }


    static async login(data: z.infer<typeof loginSchema>){

        const{username , password} = data

        const user = await prisma.user.findUnique({
            where: { username }
        })

        if(!user){
            throw new AppError(401,"user not registered")
        }

        const passwordCompare = await  bcrypt.compare(password,user.password)
        if(!passwordCompare){
            throw new AppError(401 , "Password Entered is Wrong ")
        }

        const accessToken = signAccessToken(user.id);
        const refreshToken = signRefreshToken(user.id);

        const { password: _, ...safeUser } = user;
        return { user: safeUser, accessToken, refreshToken };

    }

    static async refresh(token: string) {
    try {
      const payload = verifyRefreshToken(token);
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, username: true, avatar: true },
      });
      if (!user) {
        throw new AppError(401, "User not found");
      }
      const accessToken = signAccessToken(user.id);
      return { user, accessToken };
    } catch {
      throw new AppError(401, "Invalid refresh token");
    }
  }
}




