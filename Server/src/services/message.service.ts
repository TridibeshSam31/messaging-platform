/*

Handles paginated message database retrievals, writes, and soft deletes.

getMessages(conversationId: string, userId: string, cursor?: string, limit: number = 50)
Logic: Call assertMembership(conversationId, userId). Run a database query ordered by createdAt: "desc". Include senders, attachments, and receipts. Slice lists according to cursor input (see Phase 4.2).
Returns: { messages: Message[], nextCursor: string | null }
sendMessage(conversationId: string, senderId: string, data: { type, content?, attachments? })
Logic: Verify membership. Execute a transaction:
Create Message row.
Create child Attachment rows if attachments exist.
Update conversation's lastMessageId and updatedAt.
Returns: Message (fully populated with attachments and sender profile)
editMessage(messageId: string, userId: string, content: string)
Logic: Fetch message. Verify senderId === userId. Update database fields content and editedAt.
Returns: Message
deleteMessage(messageId: string, userId: string)
Logic: Fetch message. Verify senderId === userId. Perform soft delete by setting deletedAt to current timestamp and setting content to null.
markAsRead(messageId: string, userId: string, conversationId: string)
Logic: Upsert a ReadReceipt record mapping the user to the message. Update the member's lastReadMessageId in ConversationMember.
Returns: { messageId, userId, readAt }







*/


import {AppError} from "../middleware/errorHandler.js"
import {prisma} from "../lib/prisma.js"
import { MessageType, Prisma } from "@prisma/client"
//Phase 5: the service publishes after saving. publishEvent is transport-neutral —
//it takes plain data (room id + payload) and knows nothing about req/res or a ws socket
import { publishEvent } from "../socket/realtime.js"

export class MessageHandlerClass{
    static async getMessages(conversationId:string , userId:string, cursor?:string,limit:number = 50){

        //verify membership
        await prisma.conversationMember.findFirstOrThrow({
            where: {
                conversationId,
                userId
            }
        })

        //cursor pagination that we will use to show user required amt of 
        //of messages in a particulat chat  
        //first the newest msg will be fetched first then the remaining ones 
        //if there are 100 msgs then the order will me 100,99 ---- limit-1 then limit etc 
        /*
        
       cursor = kis record ke baad se next page shuru karna hai
       skip: 1 = cursor wale record ko dobara mat bhejo
       take: limit + 1 = check karo aur data bacha hai ya nahi
       pop() = extra record hata do aur hasMore decide kar lo
    

       First Request
            ↓

        10 9
       cursor = 9

         ↓

     Second Request(cursor=9)

        8 7
    cursor = 7

      ↓

    Third Request(cursor=7)

      6 5
    cursor = null
              
        
        */

        const messages = await prisma.message.findMany({
            where:{conversationId,deletedAt:null},
            take: limit + 1,
            ...(cursor && {
                cursor:{id:cursor},
                skip:1
            }),
            orderBy:{createdAt:"desc"},
            include:{
                sender:{
                    select:{
                        id:true,
                        name:true,
                        avatar:true
                    }
                },
                attachments:true
            }
        })

        const hasMore = messages.length > limit
        if(hasMore){
            messages.pop() // O(1) time complexity  because messages is an array [] and if we use shift etc function that will be O(n), also this will remove one extra msg and will set in the limit 
        }
        
        //Agar aur messages bache hain, to last returned message ki id ko nextCursor bana do. Warna nextCursor ko null kar do.
        const nextCursor = hasMore ? messages[messages.length - 1]?.id ?? null : null

        return {
            messages,
            nextCursor
        }




    }

    //Phase 2 — message recovery
    //client reconnects and says "the last message I have is afterId" → send everything newer
    //opposite direction of getMessages above: oldest-first (asc), starting AFTER a message
    static async getMessagesAfter(conversationId:string, userId:string, afterId:string, limit:number = 100){

        //verify membership (same guard as getMessages)
        await prisma.conversationMember.findFirstOrThrow({
            where: {
                conversationId,
                userId
            }
        })

        //find WHEN the client's last message was created — that time is our starting point
        const afterMessage = await prisma.message.findFirst({
            where: { id: afterId, conversationId },
            select: { createdAt: true }
        })

        //unknown id → we can't tell what's missing, so tell the client to just reload the latest page
        if (!afterMessage) {
            return { messages: [], hasMore: true }
        }

        const messages = await prisma.message.findMany({
            where: {
                conversationId,
                deletedAt: null,
                createdAt: { gt: afterMessage.createdAt } //gt = greater than = strictly newer
            },
            orderBy: { createdAt: "asc" }, //oldest first, so the client can append them in order
            take: limit + 1, //same +1 trick as getMessages: fetch one extra to know if more exist
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                },
                attachments: true
            }
        })

        //more than `limit` missed? drop the extra one and flag it — the client will reload instead
        const hasMore = messages.length > limit
        if (hasMore) {
            messages.pop()
        }

        return {
            messages,
            hasMore
        }
    }

    static async sendMessage(conversationId:string,content:string,senderId:string,data:{type:MessageType,content?:string,attachment?:{url:string,mimeType:string,size:number,fileName?:string}[],clientMessageId?:string}){
        
        //verifying the membership first
        await prisma.conversationMember.findUniqueOrThrow({
            where:{
                conversationId_userId:{
                    conversationId,
                    userId:senderId
                }
            }
        })

        //Phase 5: keep the saved message in a variable instead of returning right away,
        //because we still have to publish it after the transaction has committed
        let savedMessage

        try {

        savedMessage = await prisma.$transaction(async(tx)=>{
            //create message

            const messageData: any = {
                conversationId,
                senderId,
                type: data.type,
                // Prisma schema expects content: string | null; ensure undefined becomes null
                content: data.content ?? null,
                // Phase 6: null when an old client doesn't send one (then no dedupe)
                clientMessageId: data.clientMessageId ?? null,
            }

            if (data.attachment) {
                // only add attachments property when attachments exist to satisfy strict exactOptionalPropertyTypes
                messageData.attachments = { create: data.attachment }
            }

            const message = await tx.message.create({
                data: messageData,
                include:{
                    sender:{
                        select:{
                            id:true,
                            name:true,
                            avatar:true
                        }
                    },
                    attachments:true
                }
            })

            await tx.conversation.update({
                where:{
                    id:conversationId,
                },    
                data:{
                    lastMessageId:message.id,
                    updatedAt:new Date()
                }
                
            })

            return message
        })

        } catch (error) {

            //Phase 6 — idempotency.
            //P2002 = Prisma's "unique constraint failed": this (sender, clientMessageId) is
            //already saved, i.e. this request is a RETRY of a message we already created.
            //We don't check "does it exist?" before inserting, because two retries arriving
            //at the same moment (maybe on two instances) could both see "no" and both insert.
            //Letting the database refuse the second one is the only race-free way.
            if (
                data.clientMessageId &&
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const existing = await prisma.message.findUnique({
                    where: {
                        senderId_clientMessageId: { senderId, clientMessageId: data.clientMessageId }
                    },
                    include: {
                        sender: { select: { id: true, name: true, avatar: true } },
                        attachments: true
                    }
                })

                //return the ORIGINAL message, as if we had just created it. No second publish:
                //the first request already broadcast it (and Phase 2 recovery covers anyone who missed it)
                if (existing) return existing
            }

            //any other error is a real failure — let the caller handle it
            throw error
        }

        //Phase 5 — one pipeline for every transport (REST with attachments AND WebSocket text):
        //1. persist (done above — the transaction has committed by now)
        //2. publish, so every member on every server instance sees it live
        //Sent to the WHOLE room, sender included: the sender's other tabs need it too, and the
        //tab that sent it ignores the copy because the client dedupes messages by id.
        await publishEvent({
            target: "room",
            roomId: conversationId,
            payload: { type: "chat", data: savedMessage }
        })

        return savedMessage

    }

    static async editMesaage(messageId: string, userId: string, content: string){

        //find the message
        const findMessage = await prisma.message.findUnique({
            where:{
                id:messageId
            }
        })

        if(!findMessage){
            throw new AppError(404,"Message Not Found")
        }

        if(findMessage.senderId !== userId){
            throw new AppError(403,"You can only edit your own message")
            
        }

        const updated = await prisma.message.update({
            where:{
                id:messageId
            },
            data:{
                content,
                editedAt:new Date(),

            },
            include:{
                sender:{
                    select:{
                        name:true,
                        avatar:true,
                        id:true
                    }
                },
                attachments:true
            }
        })

        //Phase 5: persist first (above), then tell the room so others see the edit live
        await publishEvent({
            target: "room",
            roomId: updated.conversationId,
            payload: { type: "message_edited", data: updated }
        })

        return updated

    }

    static async deleteMessage(messageId: string, userId: string){

        const message = await prisma.message.findUnique({
            where:{
                id:messageId
            }
        })

        if(!message){
            throw new AppError(404,"Message not found")
        }

        //security fix: before this check ANY logged-in user could delete ANYONE's message
        //(same guard editMesaage already has)
        if(message.senderId !== userId){
            throw new AppError(403,"You can only delete your own message")
        }

        //soft delete 
        await prisma.message.update({
            where:{
                id:messageId
            },
            data:{
                deletedAt:new Date(),
                content:null
            }
        })
        //if hard delete then we would have used directly delete fxn and delete the id of that message directly

        //Phase 5: persist first (above), then tell the room so the bubble disappears live
        await publishEvent({
            target: "room",
            roomId: message.conversationId,
            payload: { type: "message_deleted", messageId, conversationId: message.conversationId }
        })

        return {id:messageId , conversationId:message.conversationId}
            
    }

    static async markAsRead(messageId: string, userId: string, conversationId: string) {

    await prisma.conversationMember.findUniqueOrThrow({
      where: { conversationId_userId: { conversationId, userId } },
    })
    return prisma.$transaction(async (tx) => {
      // Upsert receipt
      const receipt = await tx.readReceipt.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { readAt: new Date() },
        create: { messageId, userId },
      })

      // Update last read reference in membership
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadMessageId: messageId },
      })
      
      return receipt;
    });
  }
}