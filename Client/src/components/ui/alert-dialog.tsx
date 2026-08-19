import * as React from "react"
import * as ReactDOM from "react-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AlertDialogContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const AlertDialogContext = React.createContext<AlertDialogContextValue>({
  open: false,
  setOpen: () => {},
})

export interface AlertDialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

function AlertDialog({ open: controlledOpen, defaultOpen = false, onOpenChange, children }: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextOpen = typeof value === "function" ? value(open) : value
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, open, onOpenChange]
  )

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

function AlertDialogTrigger({ className, children, onClick, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { setOpen } = React.useContext(AlertDialogContext)

  return (
    <span
      data-slot="alert-dialog-trigger"
      className={cn("inline-block cursor-pointer", className)}
      onClick={(e) => {
        onClick?.(e)
        setOpen(true)
      }}
      {...props}
    >
      {children}
    </span>
  )
}

function AlertDialogPortal({ children }: { children?: React.ReactNode }) {
  const { open } = React.useContext(AlertDialogContext)
  if (!open) return null
  if (typeof window === "undefined") return null
  return ReactDOM.createPortal(children, document.body)
}

function AlertDialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = React.useContext(AlertDialogContext)

  return (
    <div
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150",
        className
      )}
      onClick={() => setOpen(false)}
      {...props}
    />
  )
}

function AlertDialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = React.useContext(AlertDialogContext)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    if (open) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, setOpen])

  if (!open) return null

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <div
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl bg-[#12111C] border border-white/15 p-6 text-sm text-white shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 outline-none sm:max-w-md",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="alert-dialog-title"
      className={cn("text-base font-semibold text-white", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-dialog-description"
      className={cn("text-xs text-gray-400 leading-relaxed", className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { setOpen } = React.useContext(AlertDialogContext)

  return (
    <Button
      onClick={(e) => {
        onClick?.(e)
        setOpen(false)
      }}
      className={cn("bg-rose-600 hover:bg-rose-700 text-white border-0 cursor-pointer", className)}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  onClick,
  render,
  ...props
}: React.ComponentProps<typeof Button> & { render?: React.ReactNode }) {
  const { setOpen } = React.useContext(AlertDialogContext)

  const handleClick: NonNullable<React.ComponentProps<typeof Button>["onClick"]> = (e) => {
    onClick?.(e)
    setOpen(false)
  }

  if (render && React.isValidElement(render)) {
    return React.cloneElement(render as React.ReactElement<any>, {
      onClick: handleClick,
    })
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className={cn("bg-transparent border-white/15 text-white hover:bg-white/10 cursor-pointer", className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
