"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    async function handleCallback() {
      // Supabase PKCE flow may put the code in the query string OR hash fragment
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));
      const code = params.get("code") || hashParams.get("code");

      if (code) {
        const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Auth callback error:", error.message);
          setStatus("Sign-in failed — redirecting…");
          setTimeout(() => router.replace("/admin/login"), 1500);
          return;
        }
      }

      // Wait for session to establish (Supabase may process hash fragment asynchronously)
      let retries = 0;
      const maxRetries = 10;
      while (retries < maxRetries) {
        const { data } = await supabaseBrowser.auth.getSession();
        if (data.session) {
          router.replace("/admin");
          return;
        }
        retries++;
        await new Promise(r => setTimeout(r, 300));
      }

      // If still no session after retries, redirect to login
      setStatus("Session not found — redirecting…");
      setTimeout(() => router.replace("/admin/login"), 1000);
    }

    handleCallback();
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

