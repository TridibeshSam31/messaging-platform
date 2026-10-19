/*
typing
stop typing


*/

import { WebSocket } from "ws"
import {clients,rooms} from "../index.js"
import { publishEvent } from "../realtime.js"

//find the sender , find which room he/she is in , then broadcast that he/she is writing

interface TypingMessage{
    type:"typing",
    roomId:string
}

interface StopTypingMessage{
    type:"stop_typing",
    roomId:string
}

export function handleTyping(ws:WebSocket,message:TypingMessage | StopTypingMessage){

    const sender = clients.get(ws)

    if(!sender) return

    //find room

    const sockets = rooms.get(message.roomId)

    if(!sockets){
        return
    }

    //broadcast through Redis (Phase 3), skipping my own socket
    //`void` = fire-and-forget: publishEvent never throws, and typing doesn't need to wait

    void publishEvent({
        target:"room",
        roomId:message.roomId,
        excludeConnectionId:sender.connectionId,
        payload:{
            type:message.type,
            roomId:message.roomId,
            userId:sender.userId
        }
    })

}