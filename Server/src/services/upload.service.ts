import cloudinary from "cloudinary"
import streamifier from "streamifier"

/*

streamifier is used because Multer's memoryStorage() stores the uploaded file as a Buffer (req.file.buffer), 
while Cloudinary's upload_stream() API accepts a Readable Stream, not a Buffer. 
streamifier.createReadStream(file.buffer) converts the in-memory Buffer into a stream, allowing the binary data to be piped directly to Cloudinary without first saving it to disk. 
It is not used to reduce memory usage here—the file is already in memory—but simply to make the Buffer compatible with Cloudinary's streaming API, enabling efficient uploads while avoiding temporary files.



*/