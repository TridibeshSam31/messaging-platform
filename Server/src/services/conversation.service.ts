/*


Implements relationship queries and membership authorization.

getUserConversations(userId: string)
Logic: Complex nested select . Pull conversations where user is in members, include details, and fetch read receipts to count unread messages.
Returns: ConversationListItem[]
createPrivateConversation(userId1: string, userId2: string)
Logic: Perform a database lookup to see if a private conversation already exists containing both users. If found, return it. Otherwise, initialize a new Conversation with type PRIVATE and create the ConversationMember entries in a transaction.
Returns: Conversation
createGroupConversation(creatorId: string, name: string, memberIds: string[])
Logic: Insert conversation of type GROUP with input name. Add creator with role ADMIN and other participants with role MEMBER. Execute inside a Prisma transaction.
Returns: Conversation
assertMembership(conversationId: string, userId: string)
Logic: Queries ConversationMember by unique compound index. Throws "Unauthorized" or "Not a member" error if no record is returned.
Returns: ConversationMember
updateConversation(conversationId: string, userId: string, data: { name?, avatar? })
Logic: Assert membership. Verify user role is ADMIN. Update conversation fields.
Returns: Conversation
leaveConversation(conversationId: string, userId: string)
Logic: Assert membership. Remove database membership row. If group is empty, delete the conversation entirely. If the user was the last ADMIN, assign ADMIN to the next joined member before leaving.
addMember(conversationId: string, actorId: string, newUserId: string)
Logic: Verify actor is ADMIN in the conversation. Create a membership row for newUserId.
removeMember(conversationId: string, actorId: string, targetUserId: string)
Logic: Verify actor is ADMIN in the conversation. Delete membership row for targetUserId.


*/

import {prisma} from "../lib/prisma.js"
import { AppError } from "../middleware/errorHandler.js"


export class ConversationService{

    static async assertMembership(conversationId: string, userId: string){

        const conversationMember = await prisma.conversationMember.findUnique({
            where:{
                conversationId_userId:{
                    conversationId , userId
                }

            }
        })
        
        if(!conversationMember){
            throw new AppError(403,"Not a member of this conversation")
        }
        return conversationMember


    }

   static async GetUserConversation(userId:string){
          
    const conversations = await prisma.conversation.findMany({
      where: {
        members: { some: { userId } }
      },
      include: {
        lastMessage: {
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
          }
        },
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, status: true } },
          }
        },
      },
      orderBy: { updatedAt: "desc" },
     });

    return Promise.all(
      conversations.map(async (conv) => {
        const membership = conv.members.find((m) => m.userId === userId);
        let unreadCount = 0;
        if (membership?.lastReadMessageId) {
          const lastRead = await prisma.message.findUnique({
            where: { id: membership.lastReadMessageId },
            select: { createdAt: true },
          });
          if (lastRead) {
            unreadCount = await prisma.message.count({
              where: {
                conversationId: conv.id,
                createdAt: { gt: lastRead.createdAt },
                senderId: { not: userId },
                deletedAt: null,
              },
            });
          }
        } else {
          unreadCount = await prisma.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              deletedAt: null,
            },
          });
        }
        return { ...conv, unreadCount };
      })
    );
  }

  /*
  
  what is the above fnxn doing ??

  User opens WhatsApp

        ↓

   Find all conversations where this user is a member

         ↓

   For every conversation

    Get last message

    Get members

    Calculate unread messages

       ↓

    Return everything
  
   
    But it creates a problem which is N+1 query problem I dont  know its fix currently but after users comes and seeing 
    the metrics I can see it 
  
    */

    static async createPrivateConversation(userId1: string, userId2: string){
      // Query the Conversation model (not ConversationMember) to find a PRIVATE conversation
      // that contains both users as members.
      const existing = await prisma.conversation.findFirst({
        where: {
          type: "PRIVATE",
          AND: [
            { members: { some: { userId: userId1 } } },
            { members: { some: { userId: userId2 } } },
          ],
        },
        include: { members: {include:{user:true}}},
      });

      if (existing) return existing;

      // If not found, create a new private conversation and members in a transaction.
      const conversation = await prisma.$transaction(async (tx) => {
        const conv = await tx.conversation.create({ data: { type: "PRIVATE" } });
        await tx.conversationMember.createMany({
          data: [
            { conversationId: conv.id, userId: userId1 },
            { conversationId: conv.id, userId: userId2 },
          ],
        });
        return conv;
      });

      return conversation;
    }


    static async createGroupConversation(creatorId: string, name: string, memberIds: string[]){
        const grpConversation = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversation.create({
                data: {
                    type: "GROUP",
                    name,
                    members: {
                        create: [
                            { userId: creatorId, role: "ADMIN" },
                            ...memberIds.map((id) => ({ userId: id, role: "MEMBER" as const }))
                        ]
                    }
                },
                include: { members: { include: { user: true } } }
            });
            return conv;
        });
        return grpConversation;
    }

    static async updateConversation(conversationId: string, userId: string, data: { name?: string }){

        const MemberOfConversation = await this.assertMembership(conversationId,userId)

        console.log(MemberOfConversation)

        if(MemberOfConversation.role!=="ADMIN"){
            throw new AppError(403,"Only Admins can update Settings")
        }

        const updated = await prisma.conversation.update({
            
            where:{
                id:conversationId
                    
                
            },
            data
        })

        return updated

    }

    static async leaveConversation(conversationId:string,userId:string){

        const MemberOfConversation = await this.assertMembership(conversationId,userId)
        return prisma.$transaction(async (tx) => {
       // Remove membership
      await tx.conversationMember.delete({
        where: { conversationId_userId: { conversationId, userId } },
      });
      const remaining = await tx.conversationMember.findMany({ where: { conversationId } });
      if (remaining.length === 0) {
        // Delete group if empty
        await tx.conversation.delete({ where: { id: conversationId } });
        return { action: "DELETED" };
      }
      // If the creator/last admin left, promote the next oldest member to admin
      const hasAdmin = remaining.some((m) => m.role === "ADMIN");
      if (!hasAdmin && remaining[0]) {
        await tx.conversationMember.update({
          where: { conversationId_userId: { conversationId: remaining[0].conversationId, userId: remaining[0].userId } },
          data: { role: "ADMIN" },
        });
      }
      return { action: "LEFT" };
    });
   }

    


    
}