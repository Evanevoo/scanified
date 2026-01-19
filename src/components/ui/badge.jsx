import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-semibold",
  "w-fit whitespace-nowrap shrink-0",
  "[&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none",
  "transition-all duration-200 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#40B5AD] text-white shadow-sm [a&]:hover:bg-[#2E9B94]",
        secondary:
          "border-transparent bg-gray-100 text-gray-700 [a&]:hover:bg-gray-200",
        destructive:
          "border-transparent bg-red-600 text-white shadow-sm [a&]:hover:bg-red-700",
        outline:
          "border-gray-300 bg-transparent text-gray-700 [a&]:hover:bg-gray-50",
        success:
          "border-transparent bg-emerald-600 text-white shadow-sm [a&]:hover:bg-emerald-700",
        warning:
          "border-transparent bg-amber-500 text-white shadow-sm [a&]:hover:bg-amber-600",
        info:
          "border-transparent bg-blue-600 text-white shadow-sm [a&]:hover:bg-blue-700",
      },
      size: {
        default: "px-2.5 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
