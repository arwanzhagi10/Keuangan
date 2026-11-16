import { ToastProvider } from "@/components/ui/use-toast";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}
