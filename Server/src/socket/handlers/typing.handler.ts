/*

typing
stop typing


*/

import { WebSocket } from "ws"
import {clients,rooms} from "../index.js"

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

    //broadcast 

    for(const socket of sockets){
        //dont need to send the typing to myself

        if(socket === ws){
            continue
        }

        socket.send(JSON.stringify({
            type:message.type,
            roomId:message.roomId,
            userId:sender.userId
        }))
    }

}