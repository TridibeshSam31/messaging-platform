import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import { errorHandler } from "./middleware/errorHandler.js"
import authRoutes         from "./routes/auth.routes.js"
import userRoutes         from "./routes/user.route.js"
import conversationRoutes from "./routes/conversation.routes.js"
import messageRoutes      from "./routes/message.routes.js"
import uploadRoutes       from "./routes/upload.routes.js"


const app = express()

app.use(cors({
    origin:process.env.CLIENT_URL,
    credentials:true
}))

app.use(express.json())

app.use(cookieParser())

app.get("/", (req, res) => {
    res.json({ message: "Server Starting" });
});

app.use("/api/auth", authRoutes)
app.use("/api/users",userRoutes)
app.use("/api",conversationRoutes)   // covers /api/conversations/:id/messages too
app.use("/api",messageRoutes)
app.use("/api/upload",uploadRoutes)

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    return errorHandler(req, res, next, err)
})