import { WebSocket } from "ws"
import { clients, rooms, onlineUsers } from "../index.js"
import { MessageHandlerClass } from "../../services/message.service.js"
import { prisma } from "../../lib/prisma.js"



interface ReadMessage {
    type: "read"
    messageId:      string    // the message being marked as read
    conversationId: string    // needed to upsert the ConversationMember.lastReadMessageId
}



/*
   handleRead  
 
  Client sends:
    { "type": "read", "messageId": "...", "conversationId": "..." }
 
  Server:
   1. Identify reader from clients Map
   2. Persist via MessageHandlerClass.markAsRead
      — upserts ReadReceipt row
     — updates ConversationMember.lastReadMessageId
   3. Find the original message sender
   4. Push a "read_receipt" event to every socket of the original sender
      so their UI can show the double-tick / "Seen" indicator in real time
 
  Why notify only the original sender and not the whole room?
   Read receipts are a 1-to-1 acknowledgement (reader → original sender),
    not a room-wide event. Sending to the whole room would leak who has or
    hasn't read every message to all participants.
 */
export async function handleRead(ws: WebSocket, data: ReadMessage) {

    //  find the
    const reader = clients.get(ws)

    if (!reader) {
        ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }))
        return
    }

    // PERSIST — upsert receipt + update lastReadMessageId 
    const receipt = await MessageHandlerClass.markAsRead(
        data.messageId,
        reader.userId,
        data.conversationId,
    )

    // find the original sender
    // We need the senderId to know whose sockets to notify.
    const message = await prisma.message.findUnique({
        where:  { id: data.messageId },
        select: { senderId: true },
    })

    if (!message) return   // message was deleted between send and read — ignore

    // BROADCAST "read_receipt" to all active sockets of the sender 
    // Supports multi-device: if the sender has a phone + laptop open, both get it.
    const senderSockets = onlineUsers.get(message.senderId)

    if (senderSockets) {
        const payload = JSON.stringify({
            type:           "read_receipt",
            messageId:      data.messageId,
            conversationId: data.conversationId,
            readBy:         reader.userId,
            readAt:         receipt.readAt,
        })

        for (const socket of senderSockets) {
            socket.send(payload)
        }
    }
}
