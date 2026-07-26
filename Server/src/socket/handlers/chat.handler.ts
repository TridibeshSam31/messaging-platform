/*
Message

 ACK

Read receipt


*/

import { WebSocket } from "ws";
import {clients,rooms} from "../index.js"
import { prisma } from "../../lib/prisma.js";


interface chatMessage{
    type:"chat",
    roomId:string,
    message:string
}

export async function handleChat(ws:WebSocket,data:chatMessage){

    //find sender , find room , create msg object and send

    const sender = clients.get(ws)

    if(!sender){
        ws.send(JSON.stringify({
            type:"error",
            message:"Unauthorized"
        }))

        return
    }

    //find rooms

    const sockets = rooms.get(data.roomId)

    if(!sockets){
        ws.send(JSON.stringify({
            type:"error",
            message:"Room not Found"
        }))

        return
    }

    const chatMessage = await prisma.message.create({
        data:{
            senderId:sender.userId,
            conversationId,
            content:data.message
        }
    })

    for (const socket of sockets) {

        socket.send(JSON.stringify({

            type: "chat",

            data: chatMessage

        }));

    }

    ws.send(JSON.stringify({

        type: "message_ack",

        messageId: chatMessage.id

    }));
}