import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const request = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf8f7] p-5">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white">
          <ShieldCheck size={24} />
        </div>
        {sent ? (
          <>
            <CheckCircle2 className="mt-7 text-emerald-600" size={28} />
            <h1 className="mt-4 font-display text-3xl font-semibold text-slate-950">Instructions Dispatched</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              If an account exists for that email, reset instructions have been dispatched via our email service. Please check your inbox and spam folder.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-7 font-display text-3xl font-semibold text-slate-950">Forgot your password?</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Enter your account email address to receive a secure, time-limited password reset link.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                request.mutate({ email });
              }}
              className="mt-7 space-y-4"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </label>
              <button
                type="submit"
                disabled={request.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {request.isPending ? <Loader2 className="animate-spin" size={17} /> : <Mail size={17} />} Email reset link
              </button>
            </form>
            {request.error && (
              <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{request.error.message}</p>
            )}
          </>
        )}
        <Link href="/" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-rose-700">
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </div>
    </main>
  );
}
