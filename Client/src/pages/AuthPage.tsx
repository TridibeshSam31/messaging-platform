import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { LoginForm } from "@/components/auth/LoginForm"
import { SignupForm } from "@/components/auth/SignupForm"
import { Logo } from "@/components/ui/Logo"

interface AuthPageProps {
  initialMode?: "login" | "signup"
}

export function AuthPage({ initialMode = "login" }: AuthPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"login" | "signup">(
    location.pathname === "/signup" ? "signup" : initialMode
  )

  useEffect(() => {
    if (location.pathname === "/signup") setMode("signup")
    if (location.pathname === "/login" || location.pathname === "/") setMode("login")
  }, [location.pathname])

  return (
    <div className="h-screen w-screen relative flex items-center justify-center overflow-hidden select-none bg-[#050610]">
      <div className="veyra-bg-auth" />

      <div className="relative z-10 w-full max-w-6xl h-full flex flex-col md:flex-row items-center justify-between px-8 md:px-16 lg:px-24">
        {/* Left: VEYRA Brand Logo (55%) */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Logo size="lg" layout="vertical" />
        </div>

        {/* Right: Floating Auth Card (45%) */}
        <div className="w-full md:w-auto flex items-center justify-center shrink-0">
          <div className="auth-card-glass rounded-2xl w-full max-w-[340px] p-7 md:p-8">
            {mode === "login" ? (
              <LoginForm onSwitchToSignup={() => { setMode("signup"); navigate("/signup") }} />
            ) : (
              <SignupForm onSwitchToLogin={() => { setMode("login"); navigate("/login") }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
