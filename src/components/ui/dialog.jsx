import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "./button"

const DialogContext = React.createContext()

const Dialog = ({ open, onOpenChange, children, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(open || false)

  React.useEffect(() => {
    setIsOpen(open)
  }, [open])

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen)
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }

  if (!isOpen) return null

  return (
    <DialogContext.Provider value={{ isOpen, setIsOpen: handleOpenChange }}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={() => handleOpenChange(false)}
      >
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          className={cn(
            "relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  )
}

const DialogHeader = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-4",
        className
      )}
      {...props}
    />
  )
}

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <h2
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight text-gray-900",
        className
      )}
      {...props}
    />
  )
})
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-gray-600", className)}
      {...props}
    />
  )
})
DialogDescription.displayName = "DialogDescription"

const DialogContent = ({ className, children, ...props }) => {
  const { setIsOpen } = React.useContext(DialogContext)
  
  return (
    <>
      <div className={cn("p-6 pt-0", className)} {...props}>
        {children}
      </div>
      <button
        onClick={() => setIsOpen(false)}
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#40B5AD] focus:ring-offset-2"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    </>
  )
}

const DialogFooter = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4 gap-2",
        className
      )}
      {...props}
    />
  )
}

DialogFooter.displayName = "DialogFooter"

export {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
}
