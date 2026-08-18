import { useState, useRef } from "react"
import { Camera, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { userApi } from "@/api/users"
import { useAuthStore } from "@/stores/authStore"
import { useChatStore } from "@/stores/chatStore"
import { toast } from "sonner"

interface Props {
  currentAvatar: string | null
  name: string
}

export function AvatarUpload({ currentAvatar, name }: Props) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { updateUser } = useAuthStore()
  const { updateUserInStore } = useChatStore()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB")
      return
    }

    setUploading(true)
    try {
      const updatedUser = await userApi.updateAvatar(file)
      updateUser(updatedUser)
      if (updatedUser.id) {
        updateUserInStore(updatedUser)
      }
      toast.success("Avatar updated successfully")
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to upload avatar"
      toast.error(errorMsg)
    } finally {
      setUploading(false)
    }
  }

  const initials = name ? name.slice(0, 2).toUpperCase() : "U"

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <Avatar className="h-20 w-20 ring-2 ring-purple-500/40 group-hover:ring-purple-400 transition-all bg-purple-950">
          <AvatarImage src={currentAvatar ?? undefined} className="object-cover" />
          <AvatarFallback className="text-xl font-semibold bg-purple-900 text-white">{initials}</AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <span className="text-[11px] text-gray-400 select-none">
        Click avatar to upload new image
      </span>
    </div>
  )
}
