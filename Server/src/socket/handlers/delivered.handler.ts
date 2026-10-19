import { WebSocket } from "ws"
import { clients } from "../index.js"
import { publishEvent } from "../realtime.js"
import { prisma } from "../../lib/prisma.js"
import { metrics } from "../../lib/metrics.js"



interface DeliveredMessage {
    type:       "delivered"
    messageId: string    // the message that was delivered to this client's device
}



/**
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
        metrics.websocket.messagesSentTotal.increment();

        ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }))
        return
    }

    // find the original sender
    const message = await prisma.message.findUnique({
        where:  { id: data.messageId },
        select: { senderId: true, createdAt: true },
    })

    if (!message) return   // message deleted or bad ID — drop silently

    // Don't send a delivery receipt to yourself (edge case: sender is also recipient)
    if (message.senderId === recipient.userId) return

    // Phase 9: message delivery latency = saved in DB → recipient's device says "got it".
    // Both times come from the server's clock, so a wrong clock on the phone can't skew it.
    metrics.websocket.deliveryLatencyMs.observe(Date.now() - message.createdAt.getTime())

    // Notify all the sockets of the sender
    // Covers multi-device: if Alice has two tabs open, both tabs get the tick.
    // Phase 3: publish always — the sender may be on a different server instance
    await publishEvent({
        target: "user",
        userId: message.senderId,
        payload: {
            type:        "message_delivered",
            messageId:   data.messageId,
            deliveredTo: recipient.userId,
            deliveredAt: new Date(),
        },
    })
}