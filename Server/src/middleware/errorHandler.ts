
import {Request , Response , NextFunction} from "express"
import {ZodError} from "zod"
import {Prisma} from "@prisma/client"

//custom class to throw HTTP error codes

export class AppError extends Error {

    constructor(public statusCode:number , message:string){

        super(message)
        this.name = "ApiError"

    }
}

export const errorHandler = (req:Request , res:Response , next:NextFunction , err:any) => {

 console.error("Error caught in global handler",err)

 if(err instanceof AppError){
    return res.status(err.statusCode).json({error:err.message})
 }

  if(err instanceof ZodError){
    return res.status(400).json({
        error:"validation failed",
        details:err.issues.map((e)=>({
            field:e.path.join("."),
            message:e.message,
        }))
    })
  }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed (e.g. username already exists)
    if (err.code === "P2002") {
      const field = (err.meta?.target as string[])?.join(", ") || "field";
      return res.status(409).json({
        error: `A record with this ${field} already exists.`,
      });
    }
    // P2025: Record to update/delete not found
    if (err.code === "P2025") {
      return res.status(404).json({
        error: "The requested record could not be found.",
      });
    }
  }

  const message = err.message || "";
  
  if (message.includes("Unauthorized") || message.includes("Invalid credentials") || message.includes("Invalid token")) {
    return res.status(401).json({ error: message });
  }
  
  if (message.includes("Forbidden") || message.includes("Not a member") || message.includes("Not authorized")) {
    return res.status(403).json({ error: message });
  }
  if (message.includes("not found")) {
    return res.status(404).json({ error: message });
  }
  if (message.includes("already exists") || message.includes("taken")) {
    return res.status(409).json({ error: message });
  }

  const isDev = process.env.NODE_ENV !== "production";

  return res.status(500).json({
    error: "Internal Server Error",
    ...(isDev && { stack: err.stack, details: err.toString() }), //copying of objects 
  });

  /*
  
  
  {
  error: "Internal Server Error",
  stack: "...stack trace...",
  details: "Error: Something went wrong"
  }
  
  
  
  */
  
  

}


