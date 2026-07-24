import { Request, Response, NextFunction } from "express";
import { MessageHandlerClass} from "../services/message.service.js";
import { MessageType } from "@prisma/client";
import { z } from "zod";
import { sendMessageSchema } from "../types/index.js";



export class MessageController {
  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { cursor, limit } = req.query;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new Error("Missing conversation id");
      const result = await MessageHandlerClass.getMessages(
        id, // Conversation ID
        req.userId!,
        cursor as string | undefined,
        limit ? Number(limit) : undefined
      );
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async postMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = sendMessageSchema.parse(req.body);
      const message = await MessageHandlerClass.sendMessage(
        (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id)!, // Conversation ID
        req.userId!,
        validated.type,
        //@ts-ignore
        validated.content ?? ""
      );
      return res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }

  static async patchMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new Error("Missing message id");
      const updated = await MessageHandlerClass.editMesaage(id, req.userId!, content);
      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new Error("Missing message id");
      const deletedInfo = await MessageHandlerClass.deleteMessage(id, req.userId!);
      return res.status(200).json({ message: "Message deleted successfully", ...deletedInfo });
    } catch (error) {
      next(error);
    }
  }

  static async postReadReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = z.object({ conversationId: z.string() }).parse(req.body);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new Error("Missing id");
      const receipt = await MessageHandlerClass.markAsRead(id, req.userId!, conversationId);
      return res.status(201).json(receipt);
    } catch (error) {
      next(error);
    }
  }
}
