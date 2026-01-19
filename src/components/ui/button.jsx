import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out",
  "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
  "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
  "outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  "active:scale-[0.98] transform",
  {
    variants: {
      variant: {
        default:
          "bg-[#40B5AD] text-white shadow-md hover:bg-[#2E9B94] hover:shadow-lg focus-visible:ring-[#40B5AD]/50",
        destructive:
          "bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg focus-visible:ring-red-600/50",
        outline:
          "border-2 border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-300/50",
        secondary:
          "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 hover:shadow-md focus-visible:ring-gray-300/50",
        ghost:
          "text-gray-700 hover:bg-gray-100 hover:text-gray-900 shadow-none",
        link: 
          "text-[#40B5AD] underline-offset-4 hover:underline shadow-none p-0 h-auto",
        gradient:
          "bg-gradient-to-r from-[#40B5AD] to-[#5FCDC5] text-white shadow-lg hover:shadow-xl hover:from-[#2E9B94] hover:to-[#40B5AD] focus-visible:ring-[#40B5AD]/50",
      },
      size: {
        default: "h-11 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 rounded-lg gap-1.5 px-4 text-xs has-[>svg]:px-3",
        lg: "h-12 rounded-xl px-8 text-base has-[>svg]:px-6",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
