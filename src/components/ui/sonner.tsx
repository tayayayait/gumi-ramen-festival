"use client"

import * as React from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-md group-[.toaster]:p-4 group-[.toaster]:min-h-[48px]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-body-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toast]:border-l-[4px] group-[.toast]:border-l-destructive",
          success: "group-[.toast]:border-l-[4px] group-[.toast]:border-l-success",
          warning: "group-[.toast]:border-l-[4px] group-[.toast]:border-l-warning",
          info: "group-[.toast]:border-l-[4px] group-[.toast]:border-l-info",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
