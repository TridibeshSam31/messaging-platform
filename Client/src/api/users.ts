import api from "./axios";
import type { User } from "../types";

export const userApi = {

    async search(query: string): Promise<User[]> {

        const response = await api.get("/users/search", {
            params: {
                q: query
            }
        });

        return response.data;
    },

    async getMe(): Promise<User> {

        const response = await api.get("/users/me");

        return response.data.userProfile;
    },

    async updateAvatar(file: File): Promise<User> {

        const formData = new FormData();

        formData.append("avatar", file);

        const response = await api.patch(
            "/users/me/avatar",
            formData
        );

        return response.data.user;
    },


    updateProfile: async (
    data: {
        name?: string;
        username?: string;
    }
    ): Promise<User> => {

    const response = await api.patch(
        "/users/me",
        data
    );

    return response.data.updated;
}

};