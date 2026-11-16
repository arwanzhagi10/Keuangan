import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {} };
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`glass rounded-2xl p-4 shadow-lg border flex items-start gap-3 min-w-[280px] ${
                t.variant === "destructive" ? "border-red-400/50" : "border-white/60"
              }`}
            >
              {t.variant === "destructive" ? (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-sm">{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
