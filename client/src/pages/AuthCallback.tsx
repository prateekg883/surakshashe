import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/supabase";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Finalizing authentication...");

  useEffect(() => {
    async function handleAuth() {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const type = params.get("type");

        if (type === "recovery") {
          // Redirect to reset password page with token
          setLocation(`/reset-password#${hash}`);
          return;
        }

        if (accessToken) {
          // Set cookie for API requests
          document.cookie = `sb_access_token=${accessToken}; Path=/; Max-Age=2592000; SameSite=Lax`;
          if (supabase) {
            const refreshToken = params.get("refresh_token");
            if (refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            }
          }
          setStatus("success");
          setMessage("Authentication confirmed! Redirecting to SurakshaShe...");
          setTimeout(() => {
            window.location.href = "/";
          }, 1200);
          return;
        }

        // Handle code exchange if PKCE
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        if (code && supabase) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("success");
          setMessage("Email confirmed! Redirecting...");
          setTimeout(() => {
            window.location.href = "/";
          }, 1200);
          return;
        }

        // Default redirect
        setTimeout(() => {
          setLocation("/");
        }, 1500);
      } catch (err: any) {
        console.error("[AuthCallback] Error:", err);
        setStatus("error");
        setMessage(err.message || "Failed to finalize authentication.");
      }
    }

    handleAuth();
  }, [setLocation]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf8f7] p-5">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-rose-600" />
            <h1 className="mt-6 text-xl font-semibold text-slate-900">Verifying session...</h1>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-6 text-xl font-semibold text-slate-900">Success!</h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-rose-600" />
            <h1 className="mt-6 text-xl font-semibold text-slate-900">Authentication Issue</h1>
            <p className="mt-2 text-sm text-rose-600">{message}</p>
            <a
              href="/"
              className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Return to Home
            </a>
          </>
        )}
      </div>
    </main>
  );
}
