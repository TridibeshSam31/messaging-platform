import { Router } from "express";

import {ConversationController} from "../controllers/conversation.controller.js"

import { authenticate } from "../middleware/auth.js";


const router = Router()

router.use(authenticate)


router.get("/", ConversationController.getConversation)


router.post("/", ConversationController.postConversation)


router.get("/:id", ConversationController.getConversationById)


router.patch("/:id", ConversationController.patchConversation)


router.delete("/:id", ConversationController.leaveConversation)


router.post("/:id/members", ConversationController.postMember)


router.delete("/:id/members/:userId", ConversationController.deleteMember)


router.patch("/:id/members/:userId/role", ConversationController.patchMemberRole)

export default router
