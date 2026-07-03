"use client"

import { IMaskInput } from "react-imask"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface CurrencyInputProps {
  id?: string
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  min?: number
  max?: number
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ id, value, onChange, className, placeholder = "R$ 0,00", min, max }, ref) => {
    return (
      <IMaskInput
        id={id}
        mask={Number}
        radix=","
        thousandsSeparator="."
        mapToRadix={["."]}
        scale={2}
        normalizeZeros
        padFractionalZeros
        unmask
        min={min}
        max={max}
        value={value > 0 ? value.toString() : ""}
        onAccept={(val) => {
          const num = parseFloat(String(val))
          onChange(isNaN(num) ? 0 : num)
        }}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        placeholder={placeholder}
        inputRef={ref as React.Ref<HTMLInputElement>}
      />
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"
