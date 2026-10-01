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

    const recipientCount = [...sockets].filter((socket) => socket !== ws).length;

    for (const socket of sockets) {
        if (socket === ws) continue;

        metrics.websocket.messagesSentTotal.increment();

        socket.send(JSON.stringify({
            type: "chat",
            data: chatMessage
        }));
    }

    log.info("ws.chat.broadcast", {
    userId: sender.userId,
    connectionId: sender.connectionId,
    roomId: data.roomId,
    messageId: chatMessage.id,
    recipientCount,
    });

    metrics.websocket.messagesSentTotal.increment();

    ws.send(JSON.stringify({
        type: "message_ack",
        messageId: chatMessage.id,
        data:chatMessage
    }));


}