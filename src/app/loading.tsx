export default function Loading() {
  return (
    <div className="mx-auto max-w-lg">
      <header className="px-4 pt-4 pb-2">
        <div className="h-8 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </header>
      <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-lg gap-1 px-4">
          <div className="h-10 w-20 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-10 w-12 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-10 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>
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
