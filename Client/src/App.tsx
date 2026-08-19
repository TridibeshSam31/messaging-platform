import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useEffect } from "react"
import { Toaster } from "@/components/ui/sonner"
import { AuthPage } from "@/pages/AuthPage"
import { ChatPage } from "@/pages/ChatPage"
import { useAuthStore } from "@/stores/authStore"
import { authApi } from "@/api/auth"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, accessToken } = useAuthStore()

  if (loading && !user && !accessToken) {
    return null
  }

  if (!user && !loading) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  const { user, accessToken, loading, login, logout, setLoading } = useAuthStore()

  useEffect(() => {
    if (accessToken) {
      setLoading(false)
      return
    }

    let cancelled = false

    authApi
      .refresh()
      .then((data) => {
        if (!cancelled) login(data.user, data.accessToken)
      })
      .catch(() => {
        if (!cancelled) logout()
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, login, logout, setLoading])

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black text-white flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/chat" replace /> : <AuthPage initialMode="login" />}
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/chat" replace /> : <AuthPage initialMode="login" />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/chat" replace /> : <AuthPage initialMode="signup" />}
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  )
}

export default App
