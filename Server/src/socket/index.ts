//will not be using socket.io library 
//I will write the alternate code at the end so that to understand well and use the same sort of codes everywhere
//creating raw websocker servers with socket.io library 

//since there are a lot of features like 
//online_presence , offiline_presence , send_Message etc yeh saari cheje hogi
//this is somehow difficult because there will be aleast 4 sets like socket , user , rooms , online_presence 

/*
this file will be including 

Connection

JWT

clients

onlineUsers

Disconnect

Route Messages


*/

import { createServer } from "http"
import { WebSocketServer, WebSocket } from "ws"
import { verifyAccessToken } from "../lib/jwt.js"
import { handlePresence } from "./handlers/presence.handler.js"
import { handleTyping } from "./handlers/typing.handler.js"
import { handleChat } from "./handlers/chat.handler.js"
import { handleRead } from "./handlers/read.handler.js"
import { handleDelivered } from "./handlers/delivered.handler.js"
import { prisma } from "../lib/prisma.js"




//creating maps for user , rooms , socket , onlineUsers etc

export interface ClientData {
    userId: string
}

export const clients = new Map<WebSocket, ClientData>()

export const rooms = new Map<string, Set<WebSocket>>()

export const onlineUsers = new Map<string, Set<WebSocket>>()

export const socketRooms = new Map<WebSocket, Set<string>>()

//estamblishing connection

export function initializeWebSocket() {
    const httpServer = createServer()

    const wss = new WebSocketServer({
        server: httpServer
    })

    httpServer.listen(8080, () => {
        console.log("websocket server running on port 8080")
    })

    wss.on("connection", async (ws, req) => {
        //ws = socket object , or we can write socket also no problem
        try {
            //jwt authentication

            const url = new URL(
                req.url!,
                `http://${req.headers.host}`
            )

            const token = url.searchParams.get("token")

            if (!token) {
                ws.close()
                return
            }

            const decoded = verifyAccessToken(token)

            if (!decoded) {
                console.log("verification failed")
            }

            //store the client

            clients.set(ws, {
                userId: decoded.userId
            })

            //online users

            if (!onlineUsers.has(decoded.userId)) {
                onlineUsers.set(decoded.userId, new Set())
            }

            onlineUsers.get(decoded.userId)?.add(ws)

            console.log(`${decoded.userId} connected`);

            const isFirstSocket = onlineUsers.get(decoded.userId)!.size === 1
            if (isFirstSocket) {
                await prisma.user.update({
                    where: { id: decoded.userId },
                    data: { status: "ONLINE" }
                })

                // user_online broadcast — notify all room peers
                // DB se saari conversations dhundho kyunki socketRooms abhi empty hai (join_room nahi hua)
                const memberships = await prisma.conversationMember.findMany({
                    where: { userId: decoded.userId },
                    select: { conversationId: true }
                })

                for (const { conversationId } of memberships) {
                    const roomSockets = rooms.get(conversationId)
                    if (!roomSockets) continue

                    for (const socket of roomSockets) {
                        if (socket === ws) continue
                        socket.send(JSON.stringify({
                            type: "user_online",
                            userId: decoded.userId
                        }))
                    }
                }
            }

            //recieve msgs

            ws.on("message", async (raw) => {
                try {
                    const msg = JSON.parse(raw.toString())

                    if (msg.type === "join_room") {
                        handlePresence(ws, msg)
                        return
                    } else if (msg.type === "leave_room") {
                        handlePresence(ws, msg)
                        return
                    } else if (msg.type === "chat") {
                        await handleChat(ws, msg)
                        return
                    } else if (msg.type === "typing") {
                        handleTyping(ws, msg)
                        return

                    } else if (msg.type === "stop_typing") {
                        handleTyping(ws, msg)
                        return
                    } else if (msg.type === "read") {
                        await handleRead(ws, msg)
                        return

                    } else if (msg.type === "delivered") {
                        await handleDelivered(ws, msg)
                        return
                    }

                    ws.send(JSON.stringify({
                        type: "error",
                        message: "unknown message type"
                    }))

                } catch (error) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Invalid message"
                    }))


                }
            })

            //disconnect

            ws.on("close", async () => {
                const client = clients.get(ws)

                if (!client) {
                    return
                }

                //remove from rooms
                //socketRooms contain the users that have joined 

                const UsersJoinedRooms = socketRooms.get(ws)

                if (UsersJoinedRooms) {
                    //// On disconnect, socketRooms.get(ws) gives all the rooms that this socket had joined (e.g. room1, room2). We loop through each room, fetch its socket set from the rooms map, remove the disconnected socket using sockets.
                    // delete(ws), and if that room becomes empty (size === 0), we delete the room itself to avoid memory leaks. This ensures that no disconnected socket or empty room remains in memory after the connection is closed.

                    for (const roomId of UsersJoinedRooms) {
                        const sockets = rooms.get(roomId)

                        if (!sockets) continue

                        sockets.delete(ws)

                        // browser band hua bina leave_room bheje — baaki members ko batao
                        for (const socket of sockets) {
                            socket.send(JSON.stringify({
                                type: "user_left",
                                roomId,
                                userId: client.userId
                            }))
                        }

                        if (sockets.size === 0) {
                            rooms.delete(roomId)
                        }
                    }


                }

                //cleanup 

                socketRooms.delete(ws)

                clients.delete(ws)

                //remove online user socket

                const sockets = onlineUsers.get(client.userId)

                if (sockets) {
                    sockets.delete(ws)

                    if (sockets.size === 0) {
                        onlineUsers.delete(client.userId)

                        // DB mein OFFLINE + lastseen update
                        await prisma.user.update({
                            where: { id: client.userId },
                            data: { status: "OFFLINE", lastseen: new Date() }
                        })

                        // user_offline broadcast — DB se conversations dhundho
                        const memberships = await prisma.conversationMember.findMany({
                            where: { userId: client.userId },
                            select: { conversationId: true }
                        })

                        const userLastSeen = await prisma.user.findUnique({
                            where: { id: client.userId },
                            select: { lastseen: true }
                        })

                        for (const { conversationId } of memberships) {
                            const roomSockets = rooms.get(conversationId)
                            if (!roomSockets) continue

                            for (const socket of roomSockets) {
                                socket.send(JSON.stringify({
                                    type: "user_offline",
                                    userId: client.userId,
                                    lastSeen: userLastSeen?.lastseen
                                }))
                            }
                        }

                        console.log(`${client.userId} offline`)
                    }
                }
            })

        } catch (error) {
            ws.close()

        }
    })

}



/*
|--------------------------------------------------------------------------
| In-Memory Connection Store
|--------------------------------------------------------------------------
|
| The native WebSocket (ws) library provides only low-level socket
| connections. Features such as authentication, rooms, presence tracking,
| and multi-device support must be implemented manually.
|
| To achieve this, the server maintains a small in-memory state using
| Map and Set collections. These structures exist only while the server
| is running and are synchronized with the database whenever required
| (e.g. updating ONLINE/OFFLINE status).
|
| -------------------------------------------------------------------------
| clients : Map<WebSocket, ClientData>
| -------------------------------------------------------------------------
| Associates every authenticated WebSocket connection with its user.
|
| Example:
|   ws1 ──► { userId: "101" }
|   ws2 ──► { userId: "205" }
|
| Used to identify the sender for every incoming WebSocket event.
|
| -------------------------------------------------------------------------
| rooms : Map<string, Set<WebSocket>>
| -------------------------------------------------------------------------
| Maps a conversation (room) to all sockets currently subscribed to it.
|
| Example:
|   "room1" ──► { ws1, ws2, ws3 }
|   "room2" ──► { ws2, ws4 }
|
| Used for broadcasting chat messages, typing indicators, presence updates,
| read receipts, delivered receipts, and room events.
|
| -------------------------------------------------------------------------
| onlineUsers : Map<string, Set<WebSocket>>
| -------------------------------------------------------------------------
| Tracks every active socket belonging to a user.
|
| Example:
|   "101" ──► { LaptopWS, PhoneWS }
|   "205" ──► { LaptopWS }
|
| Supports multiple simultaneous sessions. A user is considered ONLINE
| while at least one socket exists. When the last socket disconnects,
| the database is updated with OFFLINE status and lastSeen timestamp,
| and a user_offline event is broadcast.
|
| -------------------------------------------------------------------------
| socketRooms : Map<WebSocket, Set<string>>
| -------------------------------------------------------------------------
| Reverse mapping that stores every room joined by a socket.
|
| Example:
|   ws1 ──► { "room1", "room2" }
|   ws2 ──► { "room1" }
|
| Enables efficient cleanup during disconnect by removing the socket
| from every joined room without scanning all rooms in memory.
|
| -------------------------------------------------------------------------
| Together these four data structures act as the runtime state of the
| chat server, enabling:
|
| • Authentication
| • Room membership
| • Multi-device support
| • Online / Offline presence
| • Message broadcasting
| • Typing indicators
| • Read & Delivered receipts
| • Efficient disconnect cleanup
|
| Persistent data such as users, conversations, messages, presence status,
| and lastSeen remain stored in PostgreSQL through Prisma, while these
| Maps only manage active runtime connections.
|--------------------------------------------------------------------------
*/

/*


Every handler — WebSocket or HTTP — follows the same Guard → Act → Broadcast pattern: first you find out who is acting (clients.get(ws) / JWT), then you check where they're allowed to act (rooms.get(roomId) / assertMembership), and if either guard fails you return immediately without touching anything.
Only after both guards pass do you mutate state or hit the database, and only then do you notify whoever needs to know — broadcasting to the room, sending an ACK to the sender, or returning a response. 
This order is non-negotiable because you can never broadcast before you've persisted, never persist before you've authorized, and never authorize before you've identified — and this exact same sequence repeats at every layer of the stack: middleware, controller, service, and socket handler. 
It is almost universally applicable, with two natural exceptions — public endpoints like login where identity is being established for the first time so there's no prior identity guard, and pure read operations where nothing changes so there's no broadcast step — but even in those cases, the core principle of validate before you act never changes

Universal pattern hai yeh
1. FIND THE SENDER (from clients map)
2. VALIDATE INPUT (check required fields)
3. FIND THE ROOM (from rooms map)
4. DO THE WORK (DB write / state mutation)
5. BROADCAST (to others or self)


*/