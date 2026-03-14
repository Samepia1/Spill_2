export default function Loading() {
  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="h-5 w-5 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="h-6 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </header>

      {/* Post card */}
      <div className="px-4 pb-2">
        <div className="rounded-xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="mb-1 h-5 w-72 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="mb-3 h-16 w-full rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* Comments heading */}
      <div className="px-4 pb-4">
        <div className="mb-3 h-4 w-28 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />

        {/* Comment skeletons */}
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              <div className="flex-1">
                <div className="mb-1 h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
