import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-white border-gray-200 shadow-sm hover:shadow-md",
    elevated: "bg-white border-gray-200 shadow-md hover:shadow-lg",
    outlined: "bg-transparent border-2 border-gray-200 shadow-none hover:border-gray-300",
    gradient: "bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-sm",
    glass: "bg-white/80 backdrop-blur-md border-gray-200/50 shadow-lg"
  }

  return (
    <div
      data-slot="card"
      className={cn(
        "text-gray-900 flex flex-col gap-6 rounded-2xl border transition-all duration-300 ease-out",
        "py-6",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 [.border-b]:border-gray-100",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-xl font-bold leading-tight text-gray-900 tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-sm leading-relaxed text-gray-600 mt-1",
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-6 text-gray-700",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-3 px-6 [.border-t]:pt-6 [.border-t]:border-gray-100",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
