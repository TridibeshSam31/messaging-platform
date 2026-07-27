/*

Translates conversation adjustments, checks access rights, and returns JSON.

getConversations(req, res)
Operation: Calls conversationService.getUserConversations(req.userId).
Outputs: 200 OK with list.
postConversation(req, res)
Inputs: Validate type, memberIds, and optional name.
Operation: Calls either createPrivateConversation (if type is PRIVATE) or createGroupConversation (if type is GROUP).
Outputs: 201 Created with new conversation structure.
getConversation(req, res)
Inputs: Extract req.params.id.
Operation: Calls conversationService.getConversationById(id, req.userId).
Outputs: 200 OK or 403 Forbidden if not a member.
patchConversation(req, res)
Operation: Calls conversationService.updateConversation(req.params.id, req.userId, req.body).
deleteConversation(req, res)
Operation: Calls conversationService.leaveConversation(req.params.id, req.userId).
postMember(req, res)
Operation: Calls conversationService.addMember(req.params.id, req.userId, req.body.userId).
deleteMember(req, res)
Operation: Calls conversationService.removeMember(req.params.id, req.userId, req.params.userId).







*/


import { ConversationService } from "../services/conversation.service.js";
import { Request, Response, NextFunction } from "express";
import {createConvSchema} from "../types/index.js"
import z from "zod"


export class ConversationController{
    static async getConversation(req:Request,res:Response,next:NextFunction){

        try {
      const list = await ConversationService.GetUserConversation(req.userId!);
      return res.status(200).json(list);
    } catch (error) {
      next(error);
    }
   }

   static async postConversation(req:Request,res:Response,next:NextFunction){
    try {
        const validation = createConvSchema.safeParse(req.body)
        console.log(validation)

        if(validation.data?.type == "PRIVATE"){
            if(!validation.data?.otherUserId){
                return res.status(400).json({error:"otherUserId is required for private chat"})
            }

            const conversation = await ConversationService.createPrivateConversation(req.userId!,validation.data.otherUserId)
            return res.status(201).json(conversation)


        }else{
            //create grp chat conversation 
            if(!validation.data?.name||!validation.data?.memberIds){
                return res.status(400).json({error:"Grp name and Grp memberIds are required to create chat"})
            }

            const grpChat = await ConversationService.createGroupConversation(
                 validation.data.name,
                 req.userId!,
                 validation.data.memberIds
            )

            return res.status(201).json(grpChat)

        }
        
    } catch (error) {
        next(error)
        
    }
   }

   static async patchConversation(req:Request,res:Response,next:NextFunction){
    try {
        const validation = z.object({ name: z.string().min(3) }).safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: "Invalid name" });
        }
        const updatedConversation = await ConversationService.updateConversation(req.userId!, req.params.id as string, { name: validation.data.name });
        return res.status(200).json(updatedConversation);
    } catch (error) {
        next(error)
    }

   }

   static async leaveConversation(req:Request,res:Response,next:NextFunction){
    try{
    const leave = await ConversationService.leaveConversation(req.params.id as string , req.userId!)
    return res.status(201).json(leave)
    
    }catch(error){
        next(error)

    }
   }

   // GET /api/conversations/:id — get conversation details + members
   static async getConversationById(req:Request,res:Response,next:NextFunction){
    try {
      const conversation = await ConversationService.getConversationById(req.params.id as string, req.userId!)
      return res.status(200).json(conversation)
    } catch (error) {
      next(error)
    }
   }

   // POST /api/conversations/:id/members — add member (admin only)
   static async postMember(req:Request,res:Response,next:NextFunction){
    try {
      const { userId: newUserId } = z.object({ userId: z.string() }).parse(req.body)
      const member = await ConversationService.addMember(req.params.id as string, req.userId!, newUserId)
      return res.status(201).json(member)
    } catch (error) {
      next(error)
    }
   }

   // DELETE /api/conversations/:id/members/:userId — remove member (admin only)
   static async deleteMember(req:Request,res:Response,next:NextFunction){
    try {
      const userId = req.params.userId as string
      const removed = await ConversationService.removeMember(req.params.id as string, req.userId!, userId)
      return res.status(200).json({ message: "Member removed successfully", removed })
    } catch (error) {
      next(error)
    }
   }

   // PATCH /api/conversations/:id/members/:userId/role — change role (admin only)
   static async patchMemberRole(req:Request,res:Response,next:NextFunction){
    try {
      const { role } = z.object({ role: z.enum(["ADMIN", "MEMBER"]) }).parse(req.body)
      const userId = req.params.userId as string ?? undefined
      const updated = await ConversationService.changeMemberRole(req.params.id as string, req.userId!, userId, role)
      return res.status(200).json(updated)
    } catch (error) {
      next(error)
    }
   }
}
