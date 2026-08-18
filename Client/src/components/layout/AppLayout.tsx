import { useState, createContext, useContext, type ReactNode } from "react"
import { Sidebar } from "./Sidebar"
import { ProfilePanel } from "../chat/ProfilePanel"
import { useChatStore } from "@/stores/chatStore"

interface ProfileContextType {
  showProfile: boolean
  toggleProfile: () => void
}

const ProfileContext = createContext<ProfileContextType>({
  showProfile: true,
  toggleProfile: () => {},
})

export const useProfileToggle = () => useContext(ProfileContext)

export function AppLayout({ children }: { children: ReactNode }) {
  const { activeConversationId, conversations } = useChatStore()
  const [showProfile, setShowProfile] = useState(true)
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null

  const toggleProfile = () => setShowProfile((prev) => !prev)

  return (
    <ProfileContext.Provider value={{ showProfile, toggleProfile }}>
      <div className="h-screen w-screen bg-[#04050d] text-white flex flex-col items-center justify-center relative overflow-hidden select-none p-4 md:p-6 lg:p-8">
        <div className="veyra-bg-app" />

        <div className="relative w-full max-w-[1140px] h-[90vh] max-h-[800px] min-h-[580px] flex flex-col items-center justify-center z-10">
          <div className="app-window-glass w-full h-full rounded-2xl overflow-hidden flex flex-row relative z-10 border border-white/10 shadow-2xl">
            {/* Column 1: Left Sidebar */}
            <div className="w-full md:w-[285px] shrink-0 md:flex flex-col border-r border-white/10 bg-[#0c0d1b]/75">
              <Sidebar />
            </div>

            {/* Column 2: Center Chat Window */}
            <main className="flex-1 flex flex-col overflow-hidden bg-black/40">
              {children}
            </main>

            {/* Column 3: Right Information Panel */}
            {showProfile && (
              <div className="hidden lg:flex h-full w-[285px] shrink-0 border-l border-white/10 bg-[#0c0d1b]/75">
                <ProfilePanel conversation={activeConversation} />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProfileContext.Provider>
  )
}
