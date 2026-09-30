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
import { log } from "../lib/logger.js";


export class AuthController{
    static async postSignup(req:Request , res:Response , next:NextFunction){
        try{

        const requestId = (req as Request & { requestId?: string }).requestId

        const validation = signupSchema.safeParse(req.body)

        if (!validation.success) {
            log.warn("auth.signup.failed", {
                requestId,
                reason: "validation_failed",
            });

            return res.status(400).json({ error: validation.error.format() })
        }

        const result = await AuthService.SignUp(validation.data)

        res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })

        log.info("auth.signup.success", {
            requestId,
            userId: result.user.id,
        });

        return res.status(201).json({user:result.user , accessToken:result.accessToken})

       }catch(error){

        log.warn("auth.signup.failed", {
            requestId: (req as Request & { requestId?: string }).requestId,
            reason: error instanceof Error ? error.message : String(error),
        });

        next(error)


       }
    }

    static async postlogin(req:Request , res:Response , next:NextFunction){
        try{

            const requestId = (req as Request & { requestId?: string }).requestId

            const validateSignin = loginSchema.safeParse(req.body)

            if(!validateSignin.success){

                log.warn("auth.login.failed", {
                    requestId,
                    reason: "validation_failed",
                });

                return res.status(400).json({error:validateSignin.error.format()})
            }

            const resultLogin = await AuthService.login(validateSignin.data)

            res.cookie("refreshToken", resultLogin.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            log.info("auth.login.success", {
                requestId,
                userId: resultLogin.user.id,
            });

            return res.status(200).json({ user: resultLogin.user, accessToken: resultLogin.accessToken });
        }catch(error){

            log.warn("auth.login.failed", {
                requestId: (req as Request & { requestId?: string }).requestId,
                reason: error instanceof Error ? error.message : String(error),
            });

            next(error)

        }
    }


    static async postRefresh(
    req: Request,
    res: Response,
    next: NextFunction
   ) {
    try {

        const requestId = (req as Request & { requestId?: string }).requestId

        const token =
            req.cookies?.refreshToken ||
            req.body?.refreshToken;

        if (!token) {

            log.warn("auth.refresh.failed", {
                requestId,
                reason: "refresh_token_missing",
            });

            return res.status(401).json({
                error: "Refresh token required",
            });
        }

        const result = await AuthService.refresh(token);

        log.info("auth.refresh.success", {
            requestId,
            userId: result.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {

        log.warn("auth.refresh.failed", {
            requestId: (req as Request & { requestId?: string }).requestId,
            reason: "invalid_refresh_token",
        });

        next(error);
    }
 } 

    static async Logout(req:Request , res:Response , next:NextFunction){

        const requestId = (req as Request & { requestId?: string }).requestId

        res.clearCookie("refreshToken")

        log.info("auth.logout", {
            requestId,
        });

        return res.status(200).json({
            message:"user logged out successfully"
        })

    }
}