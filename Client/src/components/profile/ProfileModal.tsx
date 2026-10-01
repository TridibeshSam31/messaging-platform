import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { profileSchema, type ProfileData } from "@/lib/schemas"
import { userApi } from "@/api/users"
import { useAuthStore } from "@/stores/authStore"
import { useChatStore } from "@/stores/chatStore"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AvatarUpload } from "./AvatarUpload"
import { Loader2, User } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
}

export function ProfileModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuthStore()
  const { updateUserInStore } = useChatStore()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
    },
  })

  useEffect(() => {
    if (open && user) {
      reset({
        name: user.name,
        username: user.username,
      })
    }
  }, [open, user, reset])

  const onSubmit = async (data: ProfileData) => {
    setSaving(true)
    try {
      const updatedUser = await userApi.updateProfile(data)
      updateUser(updatedUser)
      if (updatedUser.id) {
        updateUserInStore(updatedUser)
      }
      toast.success("Profile updated successfully")
      onClose()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to update profile"
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[88vh] overflow-y-auto scrollbar-thin bg-[#12111C] border border-white/15 text-white p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <User className="h-5 w-5 text-[#F59E0B]" />
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        {user && (
          <div className="py-2 space-y-6">
            <AvatarUpload currentAvatar={user.avatar} name={user.name} />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Full Name</label>
                <input
                  id="profile-name"
                  placeholder="Your Name"
                  {...register("name")}
                  className="w-full px-4 py-2.5 bg-[#181624] border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#F59E0B]/60 text-sm"
                />
                {errors.name && (
                  <p className="text-xs text-rose-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Username</label>
                <input
                  id="profile-username"
                  placeholder="username"
                  {...register("username")}
                  className="w-full px-4 py-2.5 bg-[#181624] border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#F59E0B]/60 text-sm"
                />
                {errors.username && (
                  <p className="text-xs text-rose-400">{errors.username.message}</p>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1 bg-transparent border-white/15 text-white hover:bg-white/10">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-black font-bold shadow-md shadow-amber-950/30 hover:opacity-90 border-0">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
