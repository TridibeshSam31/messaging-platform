


/*


Manages profile changes and picture uploads.

getMe(req, res)
Operation: Calls userService.getProfile(req.userId).
Outputs: 200 OK with user data.
patchMe(req, res)
Inputs: Parse and validate req.body against user schema.
Operation: Calls userService.updateProfile(req.userId, req.body).
Outputs: 200 OK with updated profile.
patchAvatar(req, res)
Inputs: Read uploaded file metadata from req.file (multer middleware).
Operation: Calls userService.updateAvatar(req.userId, req.file.path).
Outputs: 200 OK with updated avatar URL.
getSearch(req, res)
Inputs: Extract q from query string (req.query.q). Validate it is a string.
Operation: Calls userService.searchUsers(q, req.userId).
Outputs: 200 OK with user list.






*/



import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service.js";
import{updateProfileSchema} from "../types/index.js"

export class UserController{
    static async getMe(req:Request , res:Response , next:NextFunction){

        try{
            const userProfile = await UserService.getProfile(req.userId!)
            return res.status(200).json({userProfile})
        }catch(error){

            next(error)

        }

        
    }

    static async PatchMe(req:Request , res:Response , next:NextFunction){
        
    }
}

