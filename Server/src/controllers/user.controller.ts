


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
import z from "zod"
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

        try{

            const userProfileParse = updateProfileSchema.safeParse(req.body)
            if(!userProfileParse.success){
                return res.status(400).json({error: userProfileParse.error})
            }
            const updated = await UserService.updateProfile(req.userId!, userProfileParse.data as { name?: string; username?: string; });
            return res.status(200).json({updated})

        }catch(error){
            next(error)
        }

        
        
    }


    static async patchAvatar(req: Request, res: Response, next: NextFunction) {
    try {
        //@ts-ignore
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      //@ts-ignore
      const avatarUrl = `/uploads/${req.file.filename}`;
      const updated = await UserService.updateAvatar(req.userId!, avatarUrl);
      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }
  static async getSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const query = z.string().parse(req.query.q);
      const users = await UserService.searchUsers(query, req.userId!);
      return res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }
}

