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


        return prisma.user.update({
         where: { id: userId },
         data,
         select: { id: true, name: true, username: true, avatar: true },
        });
        
      

        
    }


    static async updateAvatar(userId: string, avatarUrl: string){

        const user = await prisma.user.update({
            where:{
                id:userId
            },
            data:{
                avatar:avatarUrl
            },
            select:{
                id:true,
                name:true,
                username:true,
                avatar:true

            }
        })


        return user
    }

    static async searchUsers(query: string, excludeUserId: string){

        const searchUser = await prisma.user.findMany({
            where:{
              id:{
                not:excludeUserId
              },
              OR:[
                {name:{contains:query , mode:"insensitive"}},
                { username: { contains: query, mode: "insensitive" }}
              ]
            },
            select:{
                id:true,
                name:true,
                avatar:true,
                username:true,
                status:true
            },
            take:20//Limit i.e dont send more than 20 users
        })
        return searchUser
    }


    



}


/*
Prisma's where clause is an object-based representation of SQL's WHERE statement.
 Every property inside where acts as a filter on the database query. 
 If multiple fields are written directly inside the where object, Prisma combines them using an implicit AND condition. For more complex filtering, Prisma provides logical operators such as OR, AND, and NOT. Field operators like contains, startsWith, endsWith, gt, gte, lt, lte, and not allow expressive comparisons without writing raw SQL.
  For example, id: { not: excludeUserId } translates to id != excludeUserId, while contains performs a SQL LIKE '%value%' search (or ILIKE for case-insensitive matching when mode: "insensitive" is used). 
  The OR operator accepts an array of conditions and returns records if any one of them matches, making it useful for search functionality such as matching either a user's name or username. 
  Finally, select controls which columns are returned from the database, improving both security (by excluding fields like passwords) and performance (by fetching only the required data), while take limits the number of records returned, similar to SQL's LIMIT clause. 
  Thinking of the query in SQL first and then expressing it in Prisma is often the easiest way to understand and write complex Prisma queries.



*/