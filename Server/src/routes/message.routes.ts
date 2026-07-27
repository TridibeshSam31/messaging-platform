import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { MessageController } from "../controllers/message.controller.js";
import { upload } from "../middleware/upload.js";

const router = Router()

router.use(authenticate)

router.get("/conversations/:id/messages", MessageController.getMessages)

router.post(
    "/conversations/:id/messages",
    upload.array("attachments", 10),
    MessageController.postMessage
)

router.patch("/messages/:id", MessageController.patchMessage)

router.delete("/messages/:id", MessageController.deleteMessage)

router.post("/messages/:id/read", MessageController.postReadReceipt)


export default router