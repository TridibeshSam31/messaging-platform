import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ReadReceipt } from "@/types"

interface Props {
  receipts:ReadReceipt[]
}

export function ReadReceiptRow({ receipts }: Props) {
  if (!receipts || receipts.length === 0) return null

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 justify-end mt-0.5 mr-1 select-none">
        {receipts.slice(0, 5).map((r) => (
          <Tooltip key={r.userId}>
            <TooltipTrigger>
              <span className="inline-flex shrink-0 cursor-pointer">
                <Avatar className="h-3.5 w-3.5 ring-1 ring-background">
                  <AvatarImage src={r.user.avatar ?? undefined} />
                  <AvatarFallback className="text-[8px] bg-purple-900 text-white font-semibold">
                    {r.user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs bg-[#141320] border-white/15 text-white">
              Seen by {r.user.name}
            </TooltipContent>
          </Tooltip>
        ))}
        {receipts.length > 5 && (
          <span className="text-[9px] text-gray-400 ml-0.5">
            +{receipts.length - 5}
          </span>
        )}
      </div>
    </TooltipProvider>
  )
}

export { ReadReceiptRow as ReadReceipt }
