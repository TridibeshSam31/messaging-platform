import { Router } from "express";
import {upload} from "../middleware/upload.js"
import { uploadController, uploadFile } from "../controllers/upload.controller.js";

const router = Router()

router.post("/", upload.single("file"), uploadFile)

export default router