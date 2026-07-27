/*
this file will include 

join_room

leave_room

user_online broadcast

user_offline broadcast





*/

import { WebSocket } from "ws";

import { rooms, socketRooms, clients } from "../index.js"
import { prisma } from "../../lib/prisma.js";

interface JoinRoomMessage {
    type: "join_room",
    roomId: string
}

interface LeaveRoomMessage {
    type: "leave_room",
    roomId: string
}

export async function handlePresence(ws: WebSocket, message: JoinRoomMessage | LeaveRoomMessage) {

    const { roomId } = message
    const currentUser = clients.get(ws);

    //JOIN ROOM

    if (message.type === "join_room") {



        if (!currentUser) {
            ws.send(JSON.stringify({
                type: "error",
                message: "Unauthorized"
            }));
            return;
        }

        // Verify membership
        const membership = await prisma.conversationMember.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: roomId,
                    userId: currentUser.userId
                }
            }
        });

        if (!membership) {
            ws.send(JSON.stringify({
                type: "error",
                message: "You are not a member of this conversation"
            }));
            return;
        }
        //create a room if it doesnt exist 




        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set())
        }

        //add socket to the room

        rooms.get(roomId)!.add(ws)

        //track which rooms this socket joined

        if (!socketRooms.has(ws)) {
            socketRooms.set(ws, new Set())
        }

        socketRooms.get(ws)!.add(roomId)

        //Notify the current user that he has joined this particular room

        ws.send(JSON.stringify({
            type: "joined_room",
            roomId
        }))

        //Notify other members

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

    if (message.type === "leave_room") {
        
        //adding guard of auth
        if (!currentUser) {
         ws.send(JSON.stringify({
            type: "error",
            message: "Unauthorized"
         }));
         return;
        }

        rooms.get(roomId)?.delete(ws);

        socketRooms.get(ws)?.delete(roomId);

        for (const socket of rooms.get(roomId) ?? []) {
            socket.send(JSON.stringify({
                type: "user_left",
                roomId,
                userId: currentUser?.userId
            }));
        }

        if (rooms.get(roomId)?.size === 0) {
            rooms.delete(roomId);
        }

        ws.send(JSON.stringify({
            type: "left_room",
            roomId
        }));

        return;
    }


}

/*
earlier I was sending two request on a user leaving to everytone that was not right





*/