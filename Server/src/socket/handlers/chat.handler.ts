/*
Message

 ACK

Read receipt


*/

import { WebSocket } from "ws";
import { clients, rooms } from "../index.js"

import { MessageHandlerClass } from "../../services/message.service.js";
import { log } from "../../lib/logger.js";


interface chatMessage {
    type: "chat",
    roomId: string,
    message: string
}

export async function handleChat(ws: WebSocket, data: chatMessage) {

    //find sender , find room , create msg object and send

    const sender = clients.get(ws)

    if (!sender) {
        ws.send(JSON.stringify({
            type: "error",
            message: "Unauthorized"
        }))

        log("warn", "ws.chat.rejected", {
        reason: "unauthorized",
       })

        return
    }

    //find rooms

    const sockets = rooms.get(data.roomId)

    if (!sockets) {
        ws.send(JSON.stringify({
            type: "error",
            message: "Room not Found"
        }))

        log("warn", "ws.chat.rejected", {
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

    for (const socket of sockets) {
        if (socket === ws) continue;
        socket.send(JSON.stringify({
            type: "chat",
            data: chatMessage
        }));
    }

    ws.send(JSON.stringify({
        type: "message_ack",
        messageId: chatMessage.id,
        data:chatMessage
    }));

    
}