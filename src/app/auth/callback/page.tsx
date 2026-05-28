"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    // Supabase's detectSessionInUrl handles the PKCE code exchange automatically.
    // We just listen for the auth state change and redirect when session is ready.
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          router.replace("/admin");
        }
      }
    );

    // Safety net: if the listener doesn't fire within 5s, check manually
    const timeout = setTimeout(async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (data.session) {
        router.replace("/admin");
      } else {
        setStatus("Sign-in timed out — redirecting…");
        setTimeout(() => router.replace("/admin/login"), 1000);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_rgba(74,222,128,0.3)]">
          <Loader2 size={22} className="text-black animate-spin" />
        </div>
        <p className="text-sm text-gray-400">{status}</p>
      </div>
    </div>
  );
}
