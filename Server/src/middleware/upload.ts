//multer middleware here

import { Request } from "express";
import multer , {FileFilterCallback} from "multer"


const storage = multer.memoryStorage()

const allowedTypes = new Set([
    // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",

  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",

  // Documents
  "application/pdf",
  "application/zip",
  "text/plain",
])

const fileFilter = (req:Request , file:Express.Multer.File,cb:FileFilterCallback)=>{
    if(!allowedTypes.has(file.mimetype)){
        return cb(new Error("Unsupported file type."))

    }
    cb(null, true);

}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 10,                  // Maximum files per request
  },
});