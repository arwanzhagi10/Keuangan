import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const PASSWORD = "fluid2026";

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      setEntered(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (entered) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative glass-dark rounded-3xl p-8 w-full max-w-sm border border-white/20"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-teal-400 flex items-center justify-center mb-6 mx-auto">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-center text-white font-heading font-extrabold text-2xl mb-2">Keuangan Arwan Resita</h1>
        <p className="text-center text-white/50 text-sm mb-6">Masukkan kata sandi untuk mengakses dashboard</p>

        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={`w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm border ${
            error ? "border-red-400" : "border-white/20"
          } focus:outline-none focus:border-accent transition-colors`}
          placeholder="Kata sandi"
          autoFocus
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          className="w-full mt-4 bg-gradient-to-r from-accent to-teal-400 text-white font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity"
        >
          Masuk
        </motion.button>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-xs text-center mt-3"
          >
            Kata sandi salah
          </motion.p>
        )}
      </motion.form>
    </div>
  );
}
