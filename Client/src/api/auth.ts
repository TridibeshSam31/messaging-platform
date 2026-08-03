import api from "./axios"
import type { User } from "../types"

type AuthResponse = { user: User; accessToken: string }

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await api.post("/auth/login", { username, password })
    return res.data
  },

  signup: async (name: string, username: string, password: string): Promise<AuthResponse> => {
    const res = await api.post("/auth/signup", { name, username, password })
    return res.data
  },

  refresh: async (): Promise<AuthResponse> => {
    const res = await api.post("/auth/refresh")
    return res.data
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout")
  },
}
