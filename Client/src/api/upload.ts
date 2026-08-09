import api from "./axios";
import type { UploadedFile } from "../types";

export const uploadApi = {
    async uploadFiles(files: File[]): Promise<UploadedFile[]> {
        const uploadSingle = async (file: File): Promise<UploadedFile> => {
            const formData = new FormData();
            formData.append("file", file);
            const response = await api.post("/uploads", formData);
            return response.data.attachment;
        };

        return Promise.all(files.map(uploadSingle));
    }
};