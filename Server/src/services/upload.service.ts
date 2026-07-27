import cloudinary from "../lib/cloudinary.js";
//@ts-ignore
import * as streamifier from "streamifier";

/*

streamifier is used because Multer's memoryStorage() stores the uploaded file as a Buffer (req.file.buffer), 
while Cloudinary's upload_stream() API accepts a Readable Stream, not a Buffer. 
streamifier.createReadStream(file.buffer) converts the in-memory Buffer into a stream, allowing the binary data to be piped directly to Cloudinary without first saving it to disk. 
It is not used to reduce memory usage here—the file is already in memory—but simply to make the Buffer compatible with Cloudinary's streaming API, enabling efficient uploads while avoiding temporary files.

Client
   │
POST /upload
   │
upload middleware (multer)
   │
Upload Controller
   │
Upload Service
   │
Cloudinary
   │
Return attachment metadata


Controller
    │
uploadAttachment(file)
    │
Buffer
    │
AWS SDK (PutObjectCommand)
    │
S3 Bucket
    │
Object URL + Key

*/




interface UploadResult {
  url: string;
  publicId: string;
  mimeType: string;
  size: number;
  fileName: string;
}

export const uploadFile = (
  file: Express.Multer.File
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "chat-app",
        resource_type: "auto",
      },
      (error:any, result:any) => {
        if (error || !result) {
          return reject(error);
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          mimeType: file.mimetype,
          size: file.size,
          fileName: file.originalname,
        });
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

