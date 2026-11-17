import { Wallet } from "lucide-react";

export default function ConfigNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] px-5">
      <div className="max-w-md w-full rounded-2xl glass-dark border border-white/10 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-accent to-teal-400 flex items-center justify-center mb-4">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-white text-xl mb-2">
          Koneksi database belum diatur
        </h1>
        <p className="text-white/70 text-sm leading-relaxed mb-4">
          Aplikasi ini menyimpan data keuangan di Supabase, tetapi variabel
          koneksi (<code className="text-accent">VITE_SUPABASE_URL</code> dan{" "}
          <code className="text-accent">VITE_SUPABASE_ANON_KEY</code>) belum
          ditemukan, jadi preview tampil kosong.
        </p>
        <p className="text-white/70 text-sm leading-relaxed">
          Tambahkan kedua variabel tersebut di pengaturan environment project
          ini (gunakan <span className="text-white">anon key</span>, bukan
          service_role key), lalu muat ulang preview.
        </p>
      </div>
    </div>
  );
}
