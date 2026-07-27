import { WebSocket } from "ws"
import { clients, onlineUsers } from "../index.js"
import { prisma } from "../../lib/prisma.js"



interface DeliveredMessage {
    type:      "delivered"
    messageId: string    // the message that was delivered to this client's device
}



/*
  handleDelivered  

  Client sends (as soon as it receives a "chat" event and renders the bubble):
    { "type": "delivered", "messageId": "..." }
 
  Server:
   1. Identify recipient from clients Map
    2. Look up the original sender of the message
   3. Push a "message_delivered" event to every active socket of that sender
       so their UI can upgrade the single-tick → double-tick
 
  No DB write needed here — "delivered" is a real-time signal only.
  If you later want to persist delivery (e.g., for analytics or offline replay),
  add a DeliveryReceipt model and insert it here before the broadcast.
 
  Why not broadcast to the whole room?
    Delivery is a per-device confirmation from recipient → sender.
    Other room members don't need to know your message arrived on Bob's phone.
 */
export async function handleDelivered(ws: WebSocket, data: DeliveredMessage) {

    //  find the recipent (the one reporting delivery) 
    const recipient = clients.get(ws)

    if (!recipient) {
        ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }))
        return
    }

    // find the original sender
    const message = await prisma.message.findUnique({
        where:  { id: data.messageId },
        select: { senderId: true },
    })

    if (!message) return   // message deleted or bad ID — drop silently

    // Don't send a delivery receipt to yourself (edge case: sender is also recipient)
    if (message.senderId === recipient.userId) return

    // Notify all the sockets of the sender
    // Covers multi-device: if Alice has two tabs open, both tabs get the tick.
    const senderSockets = onlineUsers.get(message.senderId)

    if (senderSockets) {
        const payload = JSON.stringify({
            type:        "message_delivered",
            messageId:   data.messageId,
            deliveredTo: recipient.userId,
            deliveredAt: new Date(),
        })

        for (const socket of senderSockets) {
            socket.send(payload)
        }
    }
}
