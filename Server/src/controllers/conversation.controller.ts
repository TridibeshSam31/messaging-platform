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

    
}
