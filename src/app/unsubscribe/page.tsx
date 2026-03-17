export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const success = params.success === "true";
  const error = params.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-100 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Spill
        </h1>
        {success ? (
          <>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              You&apos;ve been unsubscribed from email notifications.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              You can re-enable them anytime in{" "}
              <a href="/settings" className="underline">
                Settings
              </a>
              .
            </p>
          </>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error === "missing"
              ? "Invalid unsubscribe link."
              : "Something went wrong. Please try again or update your preferences in Settings."}
          </p>
        )}
      </div>
    </div>
  );
}
