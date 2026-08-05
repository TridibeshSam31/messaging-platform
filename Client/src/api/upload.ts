import api from "./axios";
import type { UploadedFile } from "../types";

export const uploadApi = {
    async uploadFiles(files: File[]): Promise<UploadedFile[]> {

        const formData = new FormData();

        files.forEach(file => {
            formData.append("files", file);
        });

        const response = await api.post("/upload", formData);

        return response.data.files;
    }
};