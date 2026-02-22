import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
  label?: string
  inputSize?: "sm" | "md" | "lg"
  startIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, label, inputSize, startIcon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
              {startIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex w-full rounded-xl border border-border bg-white px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:border-accent-blue disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
              inputSize === "sm" ? "h-9" : inputSize === "lg" ? "h-[52px]" : "h-12",
              startIcon && "pl-9",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {helperText && (
          <p className={cn("text-[12px] text-muted-foreground", error && "text-destructive font-medium")}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
