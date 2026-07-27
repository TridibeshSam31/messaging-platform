import { Request, Response, NextFunction } from "express";
import { uploadFile } from "../services/upload.service.js";

export const uploadController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const attachment = await uploadFile(req.file);

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      attachment,
    });
  } catch (error) {
    next(error);
  }
};