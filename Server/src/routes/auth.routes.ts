import { Router } from "express";
import { AuthController }  from "../controllers/auth.controller.js"

const router = Router()

router.post("/signup",AuthController.postSignup)

router.post("/login",AuthController.postlogin)

router.post("/refresh",AuthController.postRefresh)

router.post("/logout",AuthController.Logout)

export default router