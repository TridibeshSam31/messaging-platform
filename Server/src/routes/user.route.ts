import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js"
import { upload } from "../middleware/upload.js"


const router = Router()

router.use(authenticate)

router.get("/me", UserController.getMe)

router.patch("/me", UserController.PatchMe)

router.patch("/me/avatar", upload.single("avatar"), UserController.patchAvatar)

router.get("/search", UserController.getSearch)

router.get("/:id", UserController.getUserById)

export default router
