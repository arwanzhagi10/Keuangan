import { type ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Pulse", href: "#pulse" },
  { label: "Stream", href: "#stream" },
  { label: "Summary", href: "#summary" },
  { label: "Trend", href: "#trend" },
  { label: "Savings", href: "#savings" },
  { label: "Hutang & Piutang", href: "#debts" },
  { label: "Planning", href: "#planning" },
  { label: "Horizon", href: "#horizon" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 glass-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between">
          <a href="#pulse" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-teal-400 flex items-center justify-center">
              <Wallet className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-heading font-extrabold text-white text-lg">Keuangan Arwan Resita</span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                {item.label}
              </a>
            ))}
          </div>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden glass-dark"
            >
              <div className="px-5 py-3 flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {children}
    </div>
  );
}
