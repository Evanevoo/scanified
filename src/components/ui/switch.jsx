import * as React from "react"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(checked || false)

    React.useEffect(() => {
      setIsChecked(checked)
    }, [checked])

    const handleToggle = () => {
      const newChecked = !isChecked
      setIsChecked(newChecked)
      if (onCheckedChange) {
        onCheckedChange(newChecked)
      }
    }

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        ref={ref}
        onClick={handleToggle}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40B5AD] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "bg-[#40B5AD] hover:bg-[#2E9B94]" : "bg-gray-300 hover:bg-gray-400",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            isChecked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
