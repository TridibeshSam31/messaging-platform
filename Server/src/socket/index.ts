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

import createServer from "ws"
import {WebSocketServer,WebSocket} from "ws"
import { verifyAccessToken } from "../lib/jwt.js"


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
                    handlePresence(ws,message)
                }else if(msg.type === "leave_room"){
                    handlePresence(ws,message)
                }else if(msg.type === "chat"){
                    handlePresence(ws,message)
                }else if(msg.type === "typing"){
                    handleTyping(ws,message)

                }else if(msg.type === "stop_typing"){
                    handleTyping(ws,message)
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