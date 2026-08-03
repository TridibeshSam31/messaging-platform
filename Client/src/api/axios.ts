import axios from "axios"
import { useAuthStore } from "../stores/authStore"

// Create an axios instance that all API calls use
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,  // from .env file
  withCredentials: true,                   // sends cookies (for refresh token)
})

// Before every request: attach the access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// After every response: if we get a 401, try to refresh the token
api.interceptors.response.use(
  (response) => response, // success — just return it

  async (error) => {
    const isUnauthorized = error.response?.status === 401
    const alreadyRetried = error.config._retry

    if (isUnauthorized && !alreadyRetried) {
      error.config._retry = true  // mark so we don't retry forever

      try {
        // Ask the backend for a new access token using the httpOnly cookie
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        // Save the new token
        useAuthStore.getState().login(data.user, data.accessToken)

        // Retry the original request with the new token
        error.config.headers.Authorization = `Bearer ${data.accessToken}`
        return api(error.config)

      } catch {
        // Refresh failed — log the user out
        useAuthStore.getState().logout()
        window.location.href = "/"
      }
    }

    return Promise.reject(error)
  }
)

export default api

/*

Interceptors: Think of them as middleware. They run on every request/response. The request interceptor adds the token. The response interceptor handles token expiry silently — the user never sees a "logged out" screen mid-session.


*/