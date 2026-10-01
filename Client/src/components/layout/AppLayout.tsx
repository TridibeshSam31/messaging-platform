import { useState, createContext, useContext, type ReactNode } from "react"
import { X } from "lucide-react"
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
  // Default open on desktop (lg+), closed on mobile/tablet
  const [showProfile, setShowProfile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024
    }
    return true
  })

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null

  const toggleProfile = () => setShowProfile((prev) => !prev)

  return (
    <ProfileContext.Provider value={{ showProfile, toggleProfile }}>
      <div className="h-[100dvh] w-screen bg-[#04050d] text-white flex flex-col items-center justify-center relative overflow-hidden select-none p-0 md:p-4 lg:p-6">
        <div className="veyra-bg-app" />

        <div className="relative w-full max-w-[1280px] h-full md:h-[94vh] max-h-[920px] md:min-h-[580px] flex flex-col items-center justify-center z-10">
          <div className="app-window-glass w-full h-full rounded-none md:rounded-2xl overflow-hidden flex flex-row relative z-10 border-0 md:border md:border-white/10 shadow-2xl">
            {/* Column 1: Left Sidebar */}
            <div
              className={`
                ${activeConversationId ? "hidden md:flex" : "flex"}
                w-full md:w-[280px] lg:w-[300px] shrink-0 flex-col border-r border-white/10 bg-[#0b0c1b]/80 backdrop-blur-md
              `}
            >
              <Sidebar />
            </div>

            {/* Column 2: Center Chat Window */}
            <main
              className={`
                ${activeConversationId ? "flex" : "hidden md:flex"}
                flex-1 flex-col overflow-hidden bg-black/30 backdrop-blur-sm
              `}
            >
              {children}
            </main>

            {/* Column 3: Desktop Right Information Panel */}
            {showProfile && (
              <div className="hidden lg:flex h-full w-[290px] xl:w-[310px] shrink-0 border-l border-white/10 bg-[#0b0c1b]/80 backdrop-blur-md">
                <ProfilePanel conversation={activeConversation} />
              </div>
            )}

            {/* Mobile / Tablet slide-over drawer for info panel */}
            {showProfile && activeConversation && (
              <div
                className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={toggleProfile}
              >
                <div
                  className="w-[85%] max-w-[340px] h-full bg-[#0b0d1e] border-l border-white/15 shadow-2xl relative flex flex-col animate-in slide-in-from-right duration-250"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                    <span className="text-xs font-bold text-white tracking-wide">Conversation Details</span>
                    <button
                      onClick={toggleProfile}
                      className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-[#8892c0] hover:text-white flex items-center justify-center border-0 cursor-pointer transition-colors"
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <ProfilePanel conversation={activeConversation} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProfileContext.Provider>
  )
}
