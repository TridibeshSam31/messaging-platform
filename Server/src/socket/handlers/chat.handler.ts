/*
Message

 ACK

Read receipt


*/

import { WebSocket } from "ws";
import { clients, rooms } from "../index.js"

import { MessageHandlerClass } from "../../services/message.service.js";
import { log } from "../../lib/logger.js";
import { metrics } from "../../lib/metrics.js";


interface chatMessage {
    type: "chat",
    roomId: string,
    message: string
}

export async function handleChat(ws: WebSocket, data: chatMessage) {

    //find sender , find room , create msg object and send

    const sender = clients.get(ws)

    if (!sender) {
        metrics.websocket.messagesSentTotal.increment();

        ws.send(JSON.stringify({
            type: "error",
            message: "Unauthorized"
        }))

        log.warn("ws.chat.rejected", {
        reason: "unauthorized",
       })

        return
    }

    //find rooms

    const sockets = rooms.get(data.roomId)

    if (!sockets) {
        metrics.websocket.messagesSentTotal.increment();

        ws.send(JSON.stringify({
            type: "error",
            message: "Room not Found"
        }))

        log.warn("ws.chat.rejected", {
       userId: sender.userId,
       connectionId: sender.connectionId,
       roomId: data.roomId,
       reason: "room_not_found",
     })

        return
    }

    //Phase 5: the service saves AND publishes the "chat" event to the room (same as the
    //REST route) — this handler only deals with WebSocket things: parsing, guards, the ack
    const chatMessage = await MessageHandlerClass.sendMessage(
        data.roomId,
        data.message,
        sender.userId,
        { type: "TEXT", content: data.message }
    );

    log.info("ws.chat.sent", {
    userId: sender.userId,
    connectionId: sender.connectionId,
    roomId: data.roomId,
    messageId: chatMessage.id,
    } );

    //ack = "your message was saved", sent only to the socket that sent it
    metrics.websocket.messagesSentTotal.increment();

    ws.send(JSON.stringify({
        type: "message_ack",
        messageId: chatMessage.id,
        data:chatMessage
    }));


}