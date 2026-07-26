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

import createServer from "http"
import {WebSocketServer,WebSocket} from "ws"
import { verifyAccessToken } from "../lib/jwt.js"
import { handlePresence } from "./handlers/presence.handler.js"
import {handleTyping} from "./handlers/typing.handler.js"
import { handleChat } from "./handlers/chat.handler.js"

//@ts-ignore
const httpServer = createServer()

httpServer.listen(8080,()=>{
    console.log("websocket server running on port 8080")
})

const wss = new WebSocketServer({
    server:httpServer

})

//creating maps for user , rooms , socket , onlineUsers etc

export interface ClientData{
    userId:string
}

export const clients = new Map<WebSocket,ClientData>()

export const rooms = new Map<string,Set<WebSocket>>()

export const onlineUsers = new Map<string,Set<WebSocket>>()

export const socketRooms = new Map<WebSocket,Set<string>>()

//estamblishing connection

wss.on("connection",(ws,req)=>{
    //ws = socket object , or we can write socket also no problem
    try{
        //jwt authentication

        const url = new URL(
            req.url!,
            `http://${req.headers.host}`
        )

        const token = url.searchParams.get("token")

        if(!token){
            ws.close()
            return
        }

        const decoded = verifyAccessToken(token)

        if(!decoded){
            console.log("verification failed")
        }

        //store the client

        clients.set(ws,{
            userId:decoded.userId
        })

        //online users

        if(!onlineUsers.has(decoded.userId)){
            onlineUsers.set(decoded.userId,new Set())
        }

        onlineUsers.get(decoded.userId)?.add(ws)

        console.log(`${decoded.userId} connected`);

        //recieve msgs

        ws.on("message",async(raw)=>{
            try{
                const msg = JSON.parse(raw.toString())

                if(msg.type ==="join_room"){
                    handlePresence(ws,msg)
                    return
                }else if(msg.type === "leave_room"){
                    handlePresence(ws,msg)
                    return
                }else if(msg.type === "chat"){
                    await handleChat(ws, msg)   
                    return
                }else if(msg.type === "typing"){
                    handleTyping(ws,msg)
                    return

                }else if(msg.type === "stop_typing"){
                    handleTyping(ws,msg)
                    return
                }

                ws.send(JSON.stringify({
                    type:"error",
                    message:"unknown message type"
                }))

            }catch(error){
                ws.send(JSON.stringify({
                    type:"error",
                    message:"Invalid message"
                }))


            }
        })

        //disconnect

        ws.on("close",()=>{
            const client = clients.get(ws)

            if(!client){
                return
            }

            //remove from rooms
            //socketRooms contain the users that have joined 

            const UsersJoinedRooms = socketRooms.get(ws)

            if(UsersJoinedRooms){
                //// On disconnect, socketRooms.get(ws) gives all the rooms that this socket had joined (e.g. room1, room2). We loop through each room, fetch its socket set from the rooms map, remove the disconnected socket using sockets.
                // delete(ws), and if that room becomes empty (size === 0), we delete the room itself to avoid memory leaks. This ensures that no disconnected socket or empty room remains in memory after the connection is closed.

                for(const roomId of UsersJoinedRooms){
                    const sockets = rooms.get(roomId)

                    if(!sockets) continue

                    sockets.delete(ws)

                    if(sockets.size === 0){
                        rooms.delete(roomId)
                    }
                }


            }

            //cleanup 

            socketRooms.delete(ws)

            clients.delete(ws)

            //remove online user socket

            const sockets = onlineUsers.get(client.userId)

            if(sockets){
                sockets.delete(ws)

                if(sockets.size === 0){
                    onlineUsers.delete(client.userId)
                  console.log(`${client.userId} offline`);
                }
            }
        })

    }catch(error){
        ws.close()

    }
})

/*
|--------------------------------------------------------------------------
| In-Memory Connection Store
|--------------------------------------------------------------------------
|
| Since the native WebSocket (ws) library does not provide built-in support
| for user sessions, rooms, or online presence, we maintain our own
| in-memory state using Map and Set.
|
| Map stores a unique key-value pair, whereas Set stores a collection of
| unique values (no duplicates). Together they help us efficiently manage
| WebSocket connections during the lifetime of the server.
|
| -------------------------------------------------------------------------
| clients : Map<WebSocket, ClientData>
| -------------------------------------------------------------------------
| Associates each WebSocket connection with its authenticated user.
|
| Example:
|   ws1 ──► { userId: "101" }
|   ws2 ──► { userId: "205" }
|
| Used to identify the sender whenever a message is received.
|
| -------------------------------------------------------------------------
| rooms : Map<string, Set<WebSocket>>
| -------------------------------------------------------------------------
| Maps a room ID to all sockets currently connected to that room.
|
| Example:
|   "room1" ──► { ws1, ws2, ws3 }
|   "room2" ──► { ws2, ws4 }
|
| The Set ensures a socket cannot join the same room multiple times and
| allows efficient broadcasting to every participant.
|
| -------------------------------------------------------------------------
| onlineUsers : Map<string, Set<WebSocket>>
| -------------------------------------------------------------------------
| Maps a user ID to all active WebSocket connections of that user.
|
| Example:
|   "101" ──► { LaptopWS, PhoneWS }
|   "205" ──► { LaptopWS }
|
| This supports multiple active sessions (e.g., phone + laptop) while
| accurately tracking whether a user is online.
|
| -------------------------------------------------------------------------
| socketRooms : Map<WebSocket, Set<string>>
| -------------------------------------------------------------------------
| Reverse mapping of rooms, storing all room IDs joined by a socket.
|
| Example:
|   ws1 ──► { "room1", "room2" }
|   ws2 ──► { "room1" }
|
| During disconnection, this lets us quickly remove the socket from every
| joined room without iterating through all rooms in memory.
|
| -------------------------------------------------------------------------
| Together these four data structures act as the in-memory state of the
| chat server, enabling authentication, room management, presence tracking,
| broadcasting, multi-device support, and efficient cleanup on disconnect.
|--------------------------------------------------------------------------
*/

/*


Every handler — WebSocket or HTTP — follows the same Guard → Act → Broadcast pattern: first you find out who is acting (clients.get(ws) / JWT), then you check where they're allowed to act (rooms.get(roomId) / assertMembership), and if either guard fails you return immediately without touching anything.
Only after both guards pass do you mutate state or hit the database, and only then do you notify whoever needs to know — broadcasting to the room, sending an ACK to the sender, or returning a response. 
This order is non-negotiable because you can never broadcast before you've persisted, never persist before you've authorized, and never authorize before you've identified — and this exact same sequence repeats at every layer of the stack: middleware, controller, service, and socket handler. 
It is almost universally applicable, with two natural exceptions — public endpoints like login where identity is being established for the first time so there's no prior identity guard, and pure read operations where nothing changes so there's no broadcast step — but even in those cases, the core principle of validate before you act never changes











*/