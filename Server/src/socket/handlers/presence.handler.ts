/*
this file will include 

join_room

leave_room

user_online broadcast

user_offline broadcast





*/

import { WebSocket } from "ws";

import {rooms,socketRooms,clients} from "../index.js"

interface JoinRoomMessage{
    type:"join_room",
    roomId:string
}

interface LeaveRoomMessage{
    type:"leave_room",
    roomId:string
}

export function handlePresence(ws:WebSocket,message:JoinRoomMessage|LeaveRoomMessage){

    //JOIN ROOM

    if(message.type === "join_room"){
        //create a room if it doesnt exist 

        const {roomId} = message

        if(!rooms.has(roomId)){
            rooms.set(roomId,new Set())
        }

        //add socket to the room

        rooms.get(roomId)!.add(ws)

        //track which rooms this socket joined
        
        if(!socketRooms.has(ws)){
            socketRooms.set(ws,new Set())
        }

        socketRooms.get(ws)!.add(roomId)

        //Notify the current user that he has joined this particular room

        ws.send(JSON.stringify({
            type:"joined_room",
            roomId
        }))

        //Notify other members

        const currentUser = clients.get(ws)

        for (const socket of rooms.get(roomId)!) {

            if (socket === ws) continue;

            socket.send(JSON.stringify({
                type: "user_joined",
                roomId,
                userId: currentUser?.userId
            }));

        }

        return

    }

    if(message.type === "leave_room"){
        const {roomId} = message

        rooms.get(roomId)!.delete(ws)

        socketRooms.get(ws)!.delete(roomId)

        if(rooms.get(roomId)?.size==0){
            rooms.delete(roomId)
        }

        ws.send(JSON.stringify({
            type:"left_room",
            roomId
        }))

        const currentUser = clients.get(ws);

        for (const socket of rooms.get(roomId) ?? []) {

            socket.send(JSON.stringify({
                type: "user_left",
                roomId,
                userId: currentUser?.userId
            }))
        }

    }
    return

}