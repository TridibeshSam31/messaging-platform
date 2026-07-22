/*

Parses headers and payload, sets httpOnly cookies, maps statuses.

postSignup(req, res)
Inputs: Validate req.body using Zod (signupSchema).
Operation: Calls authService.signup().
Outputs: Sets the returned refreshToken in a secure, httpOnly cookie. Sends 201 Created with { user, accessToken } in body.

postLogin(req, res)
Inputs: Validate req.body using Zod (loginSchema).
Operation: Calls authService.login().
Outputs: Sets refreshToken cookie. Sends 200 OK with { user, accessToken }.

postRefresh(req, res)
Inputs: Extract refresh token from signed cookie or request body.
Operation: Calls authService.refresh().
Outputs: Sends 200 OK with new { user, accessToken }. If verification fails, returns 401 Unauthorized.






*/

import { AuthService } from "../services/auth.service.js";
import { signupSchema , loginSchema } from "../types/index.js";
import {Request , Response , NextFunction} from  "express"


export class AuthController{
    static async postSignup(req:Request , res:Response , next:NextFunction){
        try{
        const validation = signupSchema.safeParse(req.body)

        if (!validation.success) {
            return res.status(400).json({ error: validation.error.format() })
        }

        const result = await AuthService.SignUp(validation.data)

        res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })
 
        return res.status(201).json({user:result.user , Accesstoken:result.accessToken})

       }catch(error){
        next(error)


       }
    }

    static async postlogin(req:Request , res:Response , next:NextFunction){
        try{
            const validateSignin = loginSchema.safeParse(req.body)

            if(!validateSignin.success){
                return res.status(400).json({error:validateSignin.error.format()})
            }

            const resultLogin = await AuthService.login(validateSignin.data)

            res.cookie("refreshToken", resultLogin.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            return res.status(200).json({ user: resultLogin.user, accessToken: resultLogin.accessToken });
        }catch(error){
            next(error)

        }
    }


    static async postRefresh(req:Request , res:Response , next:NextFunction){
        try {

        const token = req.cookies.refreshToken || req.body.refreshToken;
        if (!token) {
        return res.status(401).json({ error: "Refresh token required" });
        }

        const result = await AuthService.refresh(token);
        return res.status(200).json(result);
            
        } catch (error) {

            next(error)
            
        }
    }

    static async Logout(req:Request , res:Response , next:NextFunction){
        res.clearCookie("refreshToken")
        return res.status(200).json({
            message:"user logged out successfully"
        })

    }
}