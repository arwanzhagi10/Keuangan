import { ToastProvider } from "@/components/ui/use-toast";
import Dashboard from "@/pages/Dashboard";
import ConfigNotice from "@/components/ConfigNotice";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigNotice />;
  }

  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}
