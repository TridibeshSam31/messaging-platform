import { useSocketStore } from "@/stores/socketStore"

// Small pill at the top of the screen, visible only while the socket is retrying.
export function ConnectionBanner() {
  // subscribe to just `status`, so this re-renders only when it changes
  const status = useSocketStore((s) => s.status)

  if (status !== "reconnecting") return null

  return (
    <div
      role="status" // screen readers announce the text when it appears
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-1.5 text-xs text-amber-200 backdrop-blur"
    >
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      Connection lost. Reconnecting…
    </div>
  )
}
