/*

purpose is to manage profiles and the following function that will iclude is 

Manages profile metadata, online status, and indexing.

getProfile(userId: string)
Logic: Query user by ID. Exclude password hash from selected fields. If missing, throw "User not found".
Returns: PublicUser


updateProfile(userId: string, data: UpdateProfileInput)
Parameters: userId, { name?, username? }
Logic: If changing username, check database uniqueness first. Update columns in DB.
Returns: PublicUser

updateAvatar(userId: string, avatarUrl: string)
Logic: Update the user's avatar database field with the new path or URL.
Returns: PublicUser

searchUsers(query: string, excludeUserId: string)
Parameters: query (search string), excludeUserId (to prevent searching yourself)
Logic: Query database using findMany where id is not excludeUserId and (name or username) contains query with insensitive mode. Limit to 10-20 results.
Returns: PublicUser[]





*/

import {prisma} from "../lib/prisma.js"
import { AppError } from "../middleware/errorHandler.js"



export class UserService{
    static async getProfile(userId:string){
        

        const user = await prisma.user.findUnique({
            where:{
                id:userId
            },
            select:{
                username:true,
                avatar:true,
                lastseen:true,
                createdAt:true,
                status:true,
                id:true,
                name:true

            }
        })

        if(!user){
            throw new AppError(404, "user not found")
        }

        return user


    }

    static async updateProfile(userId: string, data: { name?: string; username?: string }){

        
        if (data.username) {
            const existing = await prisma.user.findFirst({
                where: {
                    username: data.username,
                    NOT: {
                        id: userId,
                    },
                },
            })

            if (existing) {
                throw new AppError(400, "username already taken")
            }
        }

        

        
    }
}