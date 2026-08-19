import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

interface Props {
  onSwitchToLogin: () => void
}

export function SignupForm({ onSwitchToLogin }: Props) {
  const { handleSignup } = useAuth()
  const [agreeTerms, setAgreeTerms] = useState(false)

  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validate = () => {
    const errs: { [key: string]: string } = {}

    if (!name.trim()) {
      errs.name = "Full Name is required"
    } else if (name.trim().length < 2) {
      errs.name = "Full Name must be at least 2 characters"
    }

    if (!username.trim()) {
      errs.username = "Username is required"
    } else if (username.trim().length < 3) {
      errs.username = "Username must be at least 3 characters"
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errs.username = "Only letters, numbers, and underscores allowed"
    }

    if (!password) {
      errs.password = "Password is required"
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters"
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreeTerms) {
      toast.error("Please agree to the terms of use & privacy policy")
      return
    }

    if (validate()) {
      handleSignup(name.trim(), username.trim(), password)
    }
  }

  return (
    <div className="w-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">Sign up</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Full Name */}
        <div>
          <input
            id="signup-name"
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }))
            }}
            className="veyra-input"
            autoComplete="name"
          />
          {errors.name && (
            <p className="text-[11px] text-rose-400 mt-1 pl-1">{errors.name}</p>
          )}
        </div>

        {/* Username */}
        <div>
          <input
            id="signup-username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              if (errors.username) setErrors((prev) => ({ ...prev, username: "" }))
            }}
            className="veyra-input"
            autoComplete="username"
          />
          {errors.username && (
            <p className="text-[11px] text-rose-400 mt-1 pl-1">{errors.username}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <input
            id="signup-password"
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors((prev) => ({ ...prev, password: "" }))
            }}
            className="veyra-input"
            autoComplete="new-password"
          />
          {errors.password && (
            <p className="text-[11px] text-rose-400 mt-1 pl-1">{errors.password}</p>
          )}
        </div>

        {/* Create Account Gold Button */}
        <div className="pt-2">
          <button type="submit" className="veyra-btn-gold">
            Create Account
          </button>
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="terms-signup"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="rounded border-[#2b2e48] bg-[#141628] text-[#F59E0B] focus:ring-[#F59E0B] h-3.5 w-3.5 cursor-pointer accent-[#F59E0B]"
          />
          <label htmlFor="terms-signup" className="text-xs text-gray-300 cursor-pointer">
            Agree to the terms of use & privacy policy.
          </label>
        </div>

        {/* Mode Switcher */}
        <div className="text-xs text-gray-300 pt-1">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#F59E0B] hover:text-[#FCD34D] font-bold bg-transparent border-0 p-0 cursor-pointer transition-colors"
          >
            Login here
          </button>
        </div>
      </form>
    </div>
  )
}
