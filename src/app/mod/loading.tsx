export default function Loading() {
  return (
    <div className="mx-auto max-w-lg">
      <header className="px-4 pt-4 pb-2">
        <div className="h-8 w-32 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </header>

      {/* Status tabs */}
      <div className="flex gap-1 px-4 pb-3">
        <div className="h-8 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="h-8 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="h-8 w-22 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </div>

      {/* Report card skeletons */}
      <div className="flex flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-2 h-4 w-36 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="mb-1 h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
