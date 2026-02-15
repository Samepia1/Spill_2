"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyOtp, resendOtp } from "../actions";

function VerifyForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(formData: FormData) {
    setError(null);
    setMessage(null);
    setLoading(true);

    const result = await verifyOtp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("email", email);
    const result = await resendOtp(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setMessage(result.success);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Check your email
      </h2>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        We sent a code to{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {email}
        </span>
      </p>

      <form action={handleVerify}>
        <input type="hidden" name="email" value={email} />

        <label
          htmlFor="token"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Verification code
        </label>
        <input
          id="token"
          name="token"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          required
          autoFocus
          className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-lg tracking-widest text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {message && (
          <p className="mb-4 text-sm text-green-600 dark:text-green-400">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mb-3 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        className="w-full text-center text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Resend code
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
