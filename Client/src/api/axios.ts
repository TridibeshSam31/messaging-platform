import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios"

import { useAuthStore } from "../stores/authStore"

// Create an axios instance that all API calls use
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

// Separate axios instance for refreshing.
// IMPORTANT: this instance has NO interceptors.
const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

// Prevent multiple requests from refreshing simultaneously.
//
// Example:
//
// request A → 401 ─┐
// request B → 401 ─┼──→ ONE refresh request
// request C → 401 ─┘
//
// All three wait for the same promise.
let refreshPromise: Promise<{
  accessToken: string
  user: ReturnType<typeof useAuthStore.getState>["user"]
}> | null = null

// Before every request: attach the access token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken

    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const status = error.response?.status
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    // No response/config means this isn't an HTTP 401 we can handle.
    if (!originalRequest || status !== 401) {
      return Promise.reject(error)
    }

    const requestUrl = originalRequest.url ?? ""

    // Never try to refresh auth endpoints.
    if (
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/signup") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout")
    ) {
      return Promise.reject(error)
    }

    // If the request has already been retried, stop.
    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    const authStore = useAuthStore.getState()
    const currentToken = authStore.accessToken

    // IMPORTANT:
    //
    // If there is no access token, the user is already logged out.
    // Do NOT call /auth/refresh for every random protected request.
    if (!currentToken) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      // If another request is already refreshing,
      // wait for that same refresh request.
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post("/auth/refresh")
          .then(({ data }) => {
            if (!data?.accessToken || !data?.user) {
              throw new Error("Invalid refresh response")
            }

            return {
              accessToken: data.accessToken,
              user: data.user,
            }
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      const { accessToken, user } = await refreshPromise

      // Store the new access token.
      useAuthStore.getState().login(user!, accessToken)

      // Retry the original request with the new token.
      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${accessToken}`

      return api(originalRequest)
    } catch (refreshError) {
      // Refresh token is invalid/expired.
      // The user is genuinely logged out.
      refreshPromise = null

      useAuthStore.getState().logout()

      // Replace instead of assigning href.
      // This prevents the old authenticated page from
      // remaining in browser history.
      if (window.location.pathname !== "/") {
        window.location.replace("/")
      }

      return Promise.reject(refreshError)
    }
  }
)

export default api