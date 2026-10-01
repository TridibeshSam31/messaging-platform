import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { loginSchema, type LoginData } from "@/lib/schemas"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

interface Props {
  onSwitchToSignup: () => void
}

export function LoginForm({ onSwitchToSignup }: Props) {
  const { handleLogin, loading } = useAuth()
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  const onSubmit = (data: LoginData) => {
    if (!agreeTerms) {
      toast.error("Please agree to the terms of use & privacy policy")
      return
    }
    handleLogin(data.username.trim(), data.password)
  }

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">Login</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {/* Username */}
        <div>
          <input
            id="login-username"
            type="text"
            placeholder="Username"
            autoComplete="username"
            {...register("username")}
            className="veyra-input"
          />
          {errors.username && (
            <p className="text-[11px] text-rose-400 mt-1 pl-1">{errors.username.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              {...register("password")}
              className="veyra-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892c0] hover:text-white bg-transparent border-0 cursor-pointer p-0"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-rose-400 mt-1 pl-1">{errors.password.message}</p>
          )}
        </div>

        {/* Gold Login Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="veyra-btn-gold flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin text-black" />}
            {loading ? "Signing in..." : "Login"}
          </button>
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="terms-checkbox-login"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="rounded border-[#2b2e48] bg-[#141628] text-[#F59E0B] focus:ring-[#F59E0B] h-3.5 w-3.5 cursor-pointer accent-[#F59E0B]"
          />
          <label htmlFor="terms-checkbox-login" className="text-xs text-gray-300 cursor-pointer">
            Agree to the terms of use & privacy policy.
          </label>
        </div>

        {/* Mode Switcher */}
        <div className="text-xs text-gray-300 pt-1">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-[#F59E0B] hover:text-[#FCD34D] font-bold bg-transparent border-0 p-0 cursor-pointer transition-colors"
          >
            Sign up here
          </button>
        </div>
      </form>
    </div>
  )
}
