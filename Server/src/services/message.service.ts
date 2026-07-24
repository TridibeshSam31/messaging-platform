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
import { MessageType } from "@prisma/client"

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

    static async sendMessage(conversationId:string,content:string,senderId:string,data:{type:MessageType,content?:string,attachment?:{url:string,mimeType:string,size:number,fileName?:string}[]}){
        
        //verifying the membership first
        await prisma.conversationMember.findUniqueOrThrow({
            where:{
                conversationId_userId:{
                    conversationId,
                    userId:senderId
                }
            }
        })

        return prisma.$transaction(async(tx)=>{
            //create message 

            const messageData: any = {
                conversationId,
                senderId,
                type: data.type,
                // Prisma schema expects content: string | null; ensure undefined becomes null
                content: data.content ?? null,
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

        return prisma.message.update({
            where:{
                id:messageId
            },
            data:{
                content,
                editiedAt:new Date(),

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