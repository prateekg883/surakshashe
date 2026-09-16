import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/supabase";

export default function ResetPassword() {
  const [, params] = useRoute("/reset-password/:token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSupabaseRecovery, setIsSupabaseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if recovery token is present in URL hash (Supabase default format)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    if (accessToken && type === "recovery" && supabase) {
      setIsSupabaseRecovery(true);
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get("refresh_token") || "",
      });
    }
  }, []);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully. You can return to the app and sign in.");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reset password.");
    },
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    if (isSupabaseRecovery && supabase) {
      setLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated in Supabase Auth! Redirecting...");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } catch (err: any) {
        toast.error(err.message || "Failed to update password.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const token = params?.token || new URLSearchParams(window.location.search).get("token") || "";
    resetMutation.mutate({ token, password });
  };

  const isPending = resetMutation.isPending || loading;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf8f7] p-5">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white">
          <ShieldCheck size={24} />
        </div>
        <h1 className="mt-7 font-display text-3xl font-semibold text-slate-950">Set a new password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Choose a strong password with at least 8 characters, including a letter and a number.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">New password</span>
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</span>
            <input
              required
              minLength={8}
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {isPending ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
            Reset password
          </button>
          {resetMutation.error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {resetMutation.error.message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
