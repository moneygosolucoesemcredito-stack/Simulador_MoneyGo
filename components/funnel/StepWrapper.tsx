"use client"

import { motion } from "framer-motion"

interface StepWrapperProps {
  stepKey: string | number
  children: React.ReactNode
}

export function StepWrapper({ stepKey, children }: StepWrapperProps) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}
