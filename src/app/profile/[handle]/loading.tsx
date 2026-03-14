export default function Loading() {
  return (
    <div className="mx-auto max-w-lg">
      {/* Profile header */}
      <header className="px-4 pt-6 pb-4">
        <div className="mb-3 h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="mb-2 h-7 w-32 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="h-5 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </header>

      {/* Sort tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-1 px-4">
          <div className="h-10 w-12 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-10 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-10 w-28 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-10 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* Post cards */}
      <div className="flex flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-2 h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="mb-1 h-5 w-64 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="mb-3 h-12 w-full rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-4 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
