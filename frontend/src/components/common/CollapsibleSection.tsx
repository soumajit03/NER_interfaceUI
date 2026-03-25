import { useState } from "react"
import type { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Props {
  title: string
  children: ReactNode
}

export default function CollapsibleSection({ title, children }: Props) {
  const [open, setOpen] = useState<boolean>(true)

  return (
    <div className="section-container">
      <div
        style={{ cursor: "pointer", fontWeight: "bold", fontSize: "18px" }}
        onClick={() => setOpen(!open)}
      >
        {title} {open ? "▲" : "▼"}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ overflow: "hidden", marginTop: "15px" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}